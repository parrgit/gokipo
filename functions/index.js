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
  //------------------------- 準備↓ ----------------------------//
  console.log('----------GAME START!----------')
  let isContinuable = true //関数継続可能かflag
  //firestore
  const progressRef = fireStore.doc(`rooms/${roomId}/progress/progDoc`)

  const [progressSnap, playersSnap, roomSnap] = await Promise.all([
    fireStore.doc(`rooms/${roomId}/progress/progDoc`).get(),
    fireStore.collection(`rooms/${roomId}/players`).get(),
    fireStore.doc(`rooms/${roomId}`).get(),
  ]).catch(error => {
    console.log(error)
  })

  const isWaiting = progressSnap.data().phase === 'waiting' //フェーズがwaitingか

  const playersNum = playersSnap.size //参加人数
  const isMatch = playersNum >= roomSnap.data().minNumber && playersNum <= roomSnap.data().maxNumber //設定人数に合致しているか

  let isAllReady = true //全員readyか
  const playerIDs = [] //初手の選択用、playerIDのarray
  playersSnap.docs.forEach(doc => {
    isAllReady = isAllReady && doc.data().isReady
    playerIDs.push(doc.id) //初手決定用arrayにpush
  })
  //------------------------- 準備↑ ----------------------------//

  isContinuable = isWaiting && isMatch && isAllReady //関数開始条件
  if (!isContinuable) return //開始条件を満たしていなければリターン

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

//出し手が一名指名し、カードの中身を宣言し、提出する関数
//input: declare,real,acceptorId
//output: none
exports.give = functions.region('asia-northeast1').https.onCall(async (submission, context) => {
  console.log('==============give================')
  //------------------------- 準備↓ ----------------------------//
  let acceptorId = submission.acceptorId //受け手のid
  let giverId = context.auth.uid //出し手（発火者のid）
  const roomId = submission.roomId //ルームid
  const real = submission.real //実物
  const declare = submission.declare //宣言
  const commons = ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp'] //宣言が正常かバリデーション用

  // firestoreRefs
  const batch = fireStore.batch()
  const progressDocRef = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const giverDocRef = fireStore.doc(`rooms/${roomId}/players/${giverId}`)
  const acceptorDocRef = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`)
  const realInGiverHandDocRef = fireStore.doc(
    `/rooms/${roomId}/invPlayers/${giverId}/hand/${real.id}`
  )
  const authenticityDocRef = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
  const realDocRef = fireStore.doc(`rooms/${roomId}/real/realDoc`)

  //snapshots
  const [
    giverHandSnap,
    progressSnap,
    giverDocSnap,
    realInGiverHandDocSnap,
    acceptorDocSnap,
  ] = await Promise.all([
    fireStore.collection(`/rooms/${roomId}/invPlayers/${giverId}/hand`).get(),
    fireStore.doc(`rooms/${roomId}/progress/progDoc`).get(),
    fireStore.doc(`rooms/${roomId}/players/${giverId}`).get(),
    fireStore.doc(`/rooms/${roomId}/invPlayers/${giverId}/hand/${real.id}`).get(),
    fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get(),
  ])

  const giverHandNum = giverHandSnap.size //出し手の手札枚数
  const isGive = progressSnap.data().phase === 'give' //phaseがgiveか
  const isGiver = giverDocSnap.data().isGiver //関数発火者のisGiverがtrueか
  const isContain = Boolean(realInGiverHandDocSnap.data()) //手札に提出カードがあるか
  const isNominatable = acceptorDocSnap.data().canbeNominated //選択されたplayerは受け手になれるか
  const isValid = declare === 'king' || commons.includes(declare) //宣言が正常か
  //------------------------- 準備↑ ----------------------------//

  //バリデーション
  const isContinuable = isGive && isGiver && isContain && isNominatable && isValid //続行可能か

  if (!isContinuable) {
    console.log('条件を満たしていません')
    return
  }

  //手札0枚ではない？ 0枚であれば負け
  //ここには誘導されないはずだが、チート対策として書いておく
  if (giverHandNum < 1) {
    stop(roomId, giverId, null, fireStore, admin)
    return
  }

  const authenticity = getAuthenticity(declare, real) //真偽判定

  batch.set(authenticityDocRef, { authenticity: authenticity }) //真偽保存
  batch.set(realDocRef, { id: real.id, type: real.type, species: real.species }) //rooms/realをセット
  batch.delete(realInGiverHandDocRef) //手札から提出カード削除
  batch.update(giverDocRef, { handNum: giverHandNum - 1 }) //出し手のhandNumを更新
  batch.update(acceptorDocRef, { isAcceptor: true, canbeNominated: false }) //受け手のステート更新
  batch.update(progressDocRef, { declare: declare, phase: 'accept' }) //フェーズ更新
  await batch.commit()
})

//パスからのgive専用関数
exports.giveOfPass = functions
  .region('asia-northeast1')
  .https.onCall(async (submission, context) => {
    console.log('============== giveOfPass ================')
    //------------------------- 準備↓ ----------------------------//
    const roomId = submission.roomId //ルームid
    const declare = submission.declare //宣言
    const acceptorId = submission.acceptorId //受け手のid

    // firestoreRefs
    const batch = fireStore.batch()
    const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
    const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptorId}`)
    const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)

    const [realDocSnap, progressDocSnap, giverDocSnap, acceptorDocSnap] = await Promise.all([
      fireStore.doc(`rooms/${roomId}/real/realDoc`).get(),
      fireStore.doc(`rooms/${roomId}/progress/progDoc`).get(),
      fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`).get(),
      fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get(),
    ])
    //------------------------- 準備↑ ----------------------------//

    // ---バリデーション---
    const isPass = progressDocSnap.data().phase === 'pass' // phaseがpassか
    const isGiver = giverDocSnap.data().isGiver //関数発火者がgiverか
    const isNominatable = acceptorDocSnap.data().canbeNominated //選択されたplayerは受け手になれるか
    const isContinuable = isPass && isGiver && isNominatable
    if (!isContinuable) {
      console.log('条件を満たしていないため、実行できません')
      return
    }

    const real = realDocSnap.data() //実物をフェッチ
    const authenticity = getAuthenticity(declare, real) //実物・宣言から真偽を算出

    batch.set(authenticityDoc, { authenticity: authenticity })
    batch.update(acceptorDoc, { isAcceptor: true, canbeNominated: false })
    batch.update(progressDoc, { declare: declare, phase: 'accept' })

    await batch.commit()
  })

exports.surrender = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  let isContinuable
  const loserHandRef = fireStore.collection(`/rooms/${roomId}/invPlayers/${context.auth.uid}/hand`)
  await loserHandRef.get().then(col => {
    isContinuable = col.size === 0 //手札0なら関数を進めていく
  })
  if (!isContinuable) {
    console.log('負けではありません')
    return
  }
  stop(roomId, context.auth.uid, null, fireStore, admin)
})

exports.pass = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  console.log('-------------PASS-------------')
  //------------------------- 準備↓ ----------------------------//
  //firestore
  const batch = fireStore.batch()
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`)
  const acceptorInvDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${context.auth.uid}`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)

  const [progressSnap, acceptorDocSnap, playersSnap, realDocSnap, giverSnap] = await Promise.all([
    fireStore.doc(`rooms/${roomId}/progress/progDoc`).get(),
    fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`).get(),
    fireStore.collection(`rooms/${roomId}/players`).get(),
    fireStore.doc(`rooms/${roomId}/real/realDoc`).get(),
    fireStore
      .collection(`rooms/${roomId}/players`)
      .where('isGiver', '==', true) //出し手をクエリ
      .get(),
  ])
  //------------------------- 準備↑ ----------------------------//

  const isAccept = progressSnap.data().phase === 'accept' //acceptフェーズであることの確認
  const isAcceptor = acceptorDocSnap.data().isAcceptor //発火者のisAcceptorはtrueか
  const isNominatable = Boolean(playersSnap.docs.find(doc => doc.data().canbeNominated)) //一人以上指名可であるかの確認

  const isContinuable = isAccept && isAcceptor && isNominatable
  if (!isContinuable) {
    console.log('条件を満たしていません')
    return
  }

  const secretReal = realDocSnap.data() //前フェーズでgiverが出したrealを可視化する用（pass発火者のみクライアントにて閲覧可）
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
  //firestore
  const [realSnap, authenticitySnap, progressSnap, acceptorSnap, giverSnap] = await Promise.all([
    fireStore.doc(`rooms/${roomId}/real/realDoc`).get(),
    fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`).get(),
    fireStore.doc(`rooms/${roomId}/progress/progDoc`).get(),
    fireStore.doc(`rooms/${roomId}/players/${acceptorId}`).get(),
    fireStore
    .collection(`rooms/${roomId}/players`)
    .where('isGiver', '==', true)
    .get(),
  ])
  
  let real = {} //実物
  real.id = realSnap.data().id
  real.type = realSnap.data().type
  real.species = realSnap.data().species

  const authenticity = authenticitySnap.data().authenticity //真偽をフェッチ
  const declare = progressSnap.data().declare //宣言をフェッチ
  const isAccept = progressSnap.data().phase === 'accept' //フェーズがacceptか
  const isAcceptor = acceptorSnap.data().isAcceptor //受け手（発火者のisAcceptor）をフェッチ
  const giverId = giverSnap.docs[0].id //
  //------------------------- 準備↑ ----------------------------//

  const isContinuable = isAccept && isAcceptor
  if (!isContinuable) {
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
  const roomId = submission.roomId //ルームid
  const accum = submission.accumulations //提出カード(1or2枚)
  const declare = submission.declare //宣言
  const phase = submission.phase //フェーズ
  const uid = context.auth.uid //溜め手のid
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
  //yes,noが提出されている場合はじく
  accum.forEach(burden => {
    const flag = burden.type === 'yes' || burden.type === 'no'
    includeYesNo = includeYesNo || flag
  })
  if (includeYesNo) {
    console.log('yes/noは選択できません')
    return
  }
  //------------------------- バリデーション↑ ----------------------------//

  //以下、「1枚提出」「2枚提出」でもバリデーションあり

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
