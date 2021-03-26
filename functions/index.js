require('array-foreach-async')
const { cardDistribution } = require('./cardDistribution.js')
const { answerSub } = require('./answerSub.js')
const { accumulateSub } = require('./accumulateSub.js')
const { stop } = require('./stop.js')
const { getAuthenticity } = require('./getAuthenticity.js')
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()
var fireStore = admin.firestore()

// input: roomId
// output: none
// 【発火可能条件】 phase:'waiting'
exports.gameStart = functions.region('asia-northeast1').https.onCall(async roomId => {
  console.log('----------GAME START!----------')
  let canContinue = true //関数継続可能かflag
  let playersNum = 0 //プレイヤー数
  let phase = '' //フェーズ
  let maxNumber = 0 // 開始可能最大人数
  let minNumber = 0 // 開始可能最小人数
  let allReady = true //全員readyか
  const playerIDs = [] //初手の選択用、playerIDのarray
  //firestore
  const progressRef = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const progressSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const roomSnapshot = fireStore.doc(`rooms/${roomId}`).get()

  await Promise.all([progressSnapshot, playersSnapshot, roomSnapshot])
    .then(values => {
      phase = values[0].data().phase //フェーズ
      playersNum = values[1].size //人数
      values[1].docs.forEach(doc => {
        allReady = allReady && doc.data().isReady //全員Readyか
        playerIDs.push(doc.id) //初手決定用arrayにpush
      })
      maxNumber = values[2].data().maxNumber // 開始可能最大人数
      minNumber = values[2].data().minNumber // 開始可能最小人数
    })
    .catch(error => {
      console.log(error)
    })

  const flag1 = phase === 'waiting' //フェーズがwaitingか
  const flag2 = playersNum >= minNumber && playersNum <= maxNumber //設定人数に合致しているか
  const flag3 = allReady //全員readyしているか
  canContinue = flag1 && flag2 && flag3
  if (!canContinue) return //flag1~flag3を満たしていない→開始しない

  //カード配布関数
  cardDistribution(playersNum, roomId, fireStore)

  //最初の出し手をランダムに選択
  const random = Math.floor(playerIDs.length * Math.random())
  const firstPlayerID = playerIDs.splice(random, 1)
  const firstPlayerDoc = fireStore.doc(`/rooms/${roomId}/players/${firstPlayerID}`)
  firstPlayerDoc.update({ isGiver: true, canbeNominated: false })

  //phaseをgiveにセット
  progressRef.update({
    phase: 'give',
  })
})

//todo loading「手札配布中」nuxtの「fetch」でやる, resolveが返ってきてないときは「loading」
//出し手が一名指名し、カードの中身を宣言し、提出する関数
//input: declare,real{},acceptor output: none
exports.give = functions.region('asia-northeast1').https.onCall(async (submission, context) => {
  console.log('==============give================')
  //------------------------- 準備↓ ----------------------------//
  let canContinue = true //続行可能か判定flag
  let flag1, flag2, flag3, flag4, flag5 //バリデーション用flags
  let giverHandNum = 0 //出し手の手札枚数
  let acceptorId = submission.acceptorId
  let giverId = context.auth.uid
  let authenticity = null
  const roomId = submission.roomId
  const real = submission.real
  const declare = submission.declare
  const commons = ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp']

  // firestore系
  const batch = fireStore.batch()
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const giverDoc = fireStore.doc(`rooms/${roomId}/players/${giverId}`)
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`)
  const realInGiverHandDoc = fireStore.doc(`/rooms/${roomId}/invPlayers/${giverId}/hand/${real.id}`)
  const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)
  // snapshot系
  const progressDocSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const giverDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${giverId}`).get()
  const giverHandSnapshot = fireStore
    .collection(`/rooms/${roomId}/invPlayers/${giverId}/hand`)
    .get()
  const realInGiverHandDocSnapshot = fireStore
    .doc(`/rooms/${roomId}/invPlayers/${giverId}/hand/${real.id}`)
    .get()
  const acceptorDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get()
  //------------------------- 準備↑ ----------------------------//

  await Promise.all([
    giverHandSnapshot,
    progressDocSnapshot,
    giverDocSnapshot,
    realInGiverHandDocSnapshot,
    acceptorDocSnapshot,
  ]).then(values => {
    giverHandNum = values[0].size //手札枚数
    flag1 = values[1].data().phase === 'give' //phaseがgiveか
    flag2 = values[2].data().isGiver //関数発火者のisGiverがtrueか
    flag3 = Boolean(values[3].data()) //手札に提出カードがあるか
    flag4 = values[4].data().canbeNominated //選択されたplayerは受け手になれるか
  })
  flag5 = declare === 'king' || commons.includes(declare) //宣言が正常か
  console.log(flag5) //todokesu

  //---バリデーション---
  cancontinue = flag1 && flag2 && flag3 && flag4 && flag5

  if (!canContinue) {
    console.log('条件を満たしていません')
    return
  }

  //手札0枚ではない？ 0枚であれば負け
  //ここには誘導されないはずだが、チート対策として書いておく
  if (giverHandNum < 1) {
    stop(roomId, giverId, null, fireStore, admin)
    return
  }

  authenticity = getAuthenticity(declare, real) //真偽判定

  batch.set(authenticityDoc, { authenticity: authenticity }) //真偽保存
  batch.set(realDoc, { id: real.id, type: real.type, species: real.species }) //rooms/realをセット
  batch.delete(realInGiverHandDoc) //手札から提出カード削除
  batch.update(giverDoc, { handNum: giverHandNum - 1 }) //出し手のhandNumを更新
  batch.update(acceptorDoc, { isAcceptor: true, canbeNominated: false }) //受け手のステート更新
  batch.update(progressDoc, { declare: declare, phase: 'accept' }) //フェーズ更新
  await batch.commit()
})

//パスからのgive専用関数
exports.giveOfPass = functions
  .region('asia-northeast1')
  .https.onCall(async (submission, context) => {
    console.log('============== giveOfPass ================')
    //------------------------- 準備↓ ----------------------------//
    const roomId = submission.roomId
    const declare = submission.declare
    const acceptorId = submission.acceptorId

    let canContinue = true // 実行継続可能か
    let real = {} //実物
    let authenticity = null //真偽
    let flag1, flag2, flag3 //バリデーション用flags

    // firestoreRefs
    const batch = fireStore.batch()
    const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
    const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`)
    const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)

    const realDocSnapshot = fireStore.doc(`rooms/${roomId}/real/realDoc`).get()
    const progressDocSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
    const giverDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`).get()
    const acceptorDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get()
    //------------------------- 準備↑ ----------------------------//
    await Promise.all([
      realDocSnapshot,
      progressDocSnapshot,
      giverDocSnapshot,
      acceptorDocSnapshot,
    ]).then(values => {
      real = values[0].data() //実物をフェッチ
      flag1 = values[1].data().phase === 'pass' // phaseがpassか
      flag2 = values[2].data().isGiver //関数発火者がgiverか
      flag3 = values[3].data().canbeNominated //選択されたplayerは受け手になれるか
    })

    // ---バリデーション---//
    canContinue = flag1 && flag2 && flag3
    if (!canContinue) {
      console.log('条件を満たしていないため、実行できません')
      return
    }

    authenticity = getAuthenticity(declare, real)
    batch.set(authenticityDoc, { authenticity: authenticity })
    batch.update(acceptorDoc, { isAcceptor: true, canbeNominated: false })
    batch.update(progressDoc, { declare: declare, phase: 'accept' })

    await batch.commit()
  })

exports.surrender = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  let canContinue
  const loserHandRef = fireStore.collection(`/rooms/${roomId}/invPlayers/${context.auth.uid}/hand`)
  await loserHandRef.get().then(col => {
    canContinue = col.size === 0 //手札0なら関数を進めていく
  })
  if (!canContinue) {
    console.log('負けではありません')
    return
  }
  stop(roomId, context.auth.uid, null, fireStore, admin)
})

exports.pass = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  console.log('-------------PASS-------------')
  let canContinue = true
  let flag1, flag2, flag3
  let secretReal = {} //クライアントへの送付用
  //firestore
  let giverSnap
  const batch = fireStore.batch()
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`)
  const acceptorInvDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${context.auth.uid}`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)

  const progressDocSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const acceptorDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`).get()
  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const realDocSnapshot = fireStore.doc(`rooms/${roomId}/real/realDoc`).get()
  const giverSnapshot = fireStore
    .collection(`rooms/${roomId}/players`)
    .where('isGiver', '==', true) //出し手をクエリ
    .get()

  await Promise.all([
    progressDocSnapshot,
    acceptorDocSnapshot,
    playersSnapshot,
    realDocSnapshot,
    giverSnapshot,
  ]).then(values => {
    flag1 = values[0].data().phase === 'accept' //acceptフェーズであることの確認
    flag2 = values[1].data().isAcceptor //発火者のisAcceptorはtrueか
    flag3 = Boolean(values[2].docs.find(doc => doc.data().canbeNominated)) //一人以上指名可であるかの確認
    playersSnap = values[2]
    secretReal = values[3].data() //前フェーズでgiverが出したrealを可視化する用（pass発火者のみ閲覧可）
    giverSnap = values[4]
  })

  canContinue = flag1 && flag2 && flag3
  if (!canContinue) {
    console.log('条件を満たしていません')
    return
  }

  batch.set(acceptorInvDoc, { secretReal: secretReal }) //secretRealをinvPlayers/発火者に保存
  batch.update(giverSnap.docs[0].ref, { isGiver: false }) //受け手を出し手に、出し手のisGiverをfalseにする
  batch.update(acceptorDoc, { isGiver: true, isAcceptor: false }) //受け手のステートを更新
  batch.update(progressDoc, { phase: 'pass' }) //フェーズをpassに

  await batch.commit()
})

exports.answer = functions.region('asia-northeast1').https.onCall(async (dataSet, context) => {
  console.log('===================== ANSWER ======================')
  //------------------------- 準備↓ ----------------------------//
  const roomId = dataSet.roomId //ルームID
  const answer = dataSet.ans //受け手の答え（本当/嘘）
  const acceptorId = context.auth.uid //受け手のid（answer発火者）
  let giverId = '' //出し手id
  let declare = '' //宣言
  let real = {} //実物
  let authenticity = null //真偽
  let canContinue = true
  let phase = ''
  let isAcceptor = false //発火者がacceptorであるか、確認用
  //firestore
  const realSnapshot = fireStore.doc(`rooms/${roomId}/real/realDoc`).get()
  const authenticitySnapshot = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`).get()
  const progressSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const acceptorSnapshot = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get()
  const giverSnapshot = fireStore
    .collection(`rooms/${roomId}/players`)
    .where('isGiver', '==', true)
    .get()

  await Promise.all([
    realSnapshot,
    authenticitySnapshot,
    progressSnapshot,
    acceptorSnapshot,
    giverSnapshot,
  ]).then(values => {
    real.id = values[0].data().id
    real.type = values[0].data().type
    real.species = values[0].data().species
    authenticity = values[1].data().authenticity
    declare = values[2].data().declare
    phase = values[2].data().phase
    isAcceptor = values[3].data().isAcceptor
    giverId = values[4].docs[0].id
  })
  //------------------------- 準備↑ ----------------------------//

  const flag1 = phase === 'accept'
  const flag2 = isAcceptor
  canContinue = flag1 && flag2
  if (!canContinue) {
    console.log('フェーズがacceptではない、又は発火者がacceptorではない')
    return
  }

  //出し手/受け手 どちらが勝ちか
  if (answer === authenticity) {
    //出し手負け
    answerSub(roomId, real, declare, giverId, 'giver', null, fireStore, admin)
  } else {
    //受け手負け
    answerSub(roomId, real, declare, acceptorId, 'acceptor', giverId, fireStore, admin)
  }
})

//yes/noを押し付けられた際に、宣言と同じもの1枚を溜めるか、宣言と違うもの2枚をためる
exports.accumulate = functions.region('asia-northeast1').https.onCall((submission, context) => {
  //------------------------- 準備↓ ----------------------------//
  console.log('============================ACCUMULATE!================================')
  const roomId = submission.roomId
  const accum = submission.accumulations //提出カード1or2枚
  const declare = submission.declare
  const phase = submission.phase
  const uid = context.auth.uid
  let includeYesNo = false //提出カードにyes/noが含まれていないか
  //------------------------- 準備↑ ----------------------------//

  //------------------------- バリデーション↓ ----------------------------//
  //フェーズチェック
  if (phase !== 'yesno') {
    console.log('yesnoフェーズではありません')
    return
  }
  //枚数チェック
  if (accum.length < 1 || accum.length > 2) {
    console.log('1,2枚でないと溜められません')
    return //0枚、3枚以上の場合return
  }
  //yes,noが提出されている場合、はじく
  accum.forEach(burden => {
    const flag = burden.type === 'yes' || burden.type === 'no'
    includeYesNo = includeYesNo || flag
  })
  if (includeYesNo) {
    console.log('yes/noは選択できません')
    return
  }
  //------------------------- バリデーション↑ ----------------------------//

  //1枚提出
  if (accum.length < 2) {
    if (declare === 'king') {
      if (accum[0].type === 'king') {
        accumulateSub(roomId, accum, declare, uid, fireStore, admin)
        return
      } else {
        console.log('1枚のキングを溜めるか、キング以外で2枚溜めてください')
        return
      }
    } else {
      if (accum[0].species === declare) {
        accumulateSub(roomId, accum, declare, uid, fireStore, admin)
        return
      } else {
        console.log('宣言された物と同じ厄介者を溜めてください')
        return
      }
    }
  } else {
    //2枚提出
    if (declare === 'king') {
      if (accum[0].type !== declare && accum[1].type !== declare) {
        accumulateSub(roomId, accum, declare, uid, fireStore, admin)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
        return
      }
    } else {
      if (accum[0].species !== declare && accum[1].species !== declare) {
        accumulateSub(roomId, accum, declare, uid, fireStore, admin)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
        return
      }
    }
  }
})

// サーバー側でリッスンの例【現時点では使わない】
// functionsの仕組みによりフィールドの検知はできず、ドキュメントの検知となる
// おそらくPCでのemulate（serve）では動かせない
// -------------------------------------------------//
// →「firebase deploy --only functions」でfunctionsをデプロイ◆◆◆◆若干長いけど忘れずやる◆◆◆◆
// クライアント側は普通に「npm run dev」
// サーバー側のコンソールはFirebase -> Functions -> ログ -> ▶
// exports.gameStart = functions.firestore
//   .document('/rooms/{roomId}/players/{userId}')
//   .onWrite((change, context) => {
//     console.log('GAME START!')
//     console.log(context.params.roomId) //{roomId}
//     console.log(context.params.userId) //{userId}
//     console.log(change.after.data()) //変更されたドキュメントの内容を表示
//   })

//1枚ずつ読んでしまうのでlazyに呼び出したいが..もしくはhttpsCallable関数に入れ込み負担を軽くする
//初期だけやらなければ使えるっちゃ使える
// exports.calculateHandNums = functions.firestore
//   .document('/rooms/{roomId}/invPlayers/{uid}/hand/{docId}')
//   .onWrite(async (change, context) => {
//     console.log('CALCULATE!')
//     const roomId = context.params.roomId
//     const uid = context.params.uid
//     const changedHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
//     const changedPlayer = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
//     let handNum = 0
//     await changedHandCol.get().then(col => {
//       col.forEach(() => {
//         handNum++
//       })
//     })
//     changedPlayer.update({ handNum: handNum })
//   })
