const { cardDistribution } = require('./cardDistribution.js')
const { answerSub } = require('./answerSub.js')
const { accumulateSub } = require('./accumulateSub.js')
const { stop } = require('./stop.js')

require('array-foreach-async')
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()
var fireStore = admin.firestore()

//TODO関数の説明 input:XX, output:XX オートマトン的な説明
exports.gameStart = functions.region('asia-northeast1').https.onCall(async roomId => {
  console.log('----------GAME START!----------')
  let canContinue = true
  let playersNum = 0 //プレイヤー数
  let phase = ''
  let maxNumber = 0
  let minNumber = 0
  let allReady = true

  const playerIDs = [] //初手の選択用、playerIDのarray
  const progressRef = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const progressSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const roomSnapshot = fireStore.doc(`rooms/${roomId}`).get()

  await Promise.all([progressSnapshot, playersSnapshot, roomSnapshot])
    .then(values => {
      phase = values[0].data().phase //フェーズ
      playersNum = values[1].size //人数
      values[1].docs.forEach(player => {
        allReady = allReady && player.data().isReady //全員Readyか
        playerIDs.push(player.id)
      })
      maxNumber = values[2].data().maxNumber // 開始可能最大人数
      minNumber = values[2].data().minNumber // 開始可能最小人数
    })
    .catch(error => {
      console.log(error)
    })

  const flag1 = phase === 'waiting'
  const flag2 = playersNum >= minNumber && playersNum <= maxNumber
  const flag3 = allReady

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

//出し手が一名指名し、カードの中身を宣言し、提出する関数
//input: declare,real{},acceptor output: none
//TODOloading「手札配布ちゅう」nuxtの「fetch」でやる, resolveが返ってきてないときは「loading」
exports.give = functions.region('asia-northeast1').https.onCall(async (submission, context) => {
  console.log('==============give================')
  //------------------------- 準備↓ ----------------------------//
  let giversCardSum = 0
  let canContinue = true
  let acceptor = {
    id: submission.acceptorId,
  }
  let giver = {
    id: context.auth.uid,
  }
  const roomId = submission.roomId
  const real = submission.real
  const declare = submission.declare
  const commons = ['bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk']
  // firestoreRefs
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const giverHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${giver.id}/hand`)
  const giverDoc = fireStore.doc(`rooms/${roomId}/players/${giver.id}`)
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptor.id}`)
  const realInGiverHandDoc = fireStore.doc(
    `/rooms/${roomId}/invPlayers/${giver.id}/hand/${real.id}`
  )
  const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)
  //------------------------- 準備↑ ----------------------------//

  //---バリデーション---//
  //phaseがgiveか、関数発火者のisGiverがtrueか
  await progressDoc.get().then(doc => {
    const flag = doc.data().phase === 'give'
    canContinue = canContinue && flag
  })
  await giverDoc.get().then(doc => {
    canContinue = canContinue && doc.data().isGiver
  })
  if (!canContinue) return
  //手札存在するか
  await giverHandCol.get().then(col => {
    col.docs.forEach(() => {
      giversCardSum++
    })
  })
  if (giversCardSum < 1) {
    stop(roomId, giver.id, fireStore) //ココは使われないはずだが、チート対策？として書いておく
    return
  }
  //選択したカードが存在するか
  await realInGiverHandDoc.get().then(doc => {
    canContinue = canContinue && doc.data()
  })
  if (!canContinue) {
    //TODOalertを出す「エラー！カードがありません」
    console.log('DONT HAVE THE CARD')
    return
  }
  //選択されたplayerは受け手になれるか
  await acceptorDoc.get().then(doc => {
    canContinue = canContinue && doc.data().canbeNominated
  })
  if (!canContinue) {
    //TODOalertを出す「すでに出し手になっているため、指名できません」
    console.log('CANT BE ACCEPTOR')
    return
  }
  //チート宣言していないか
  canContinue = canContinue && (declare === 'king' || commons.includes(declare))
  if (!canContinue) {
    //TODOalertを出す「エラー！もう一度提出してください」
    console.log('CHEET!')
    return
  }
  setAuthenticity(declare, real, authenticityDoc)
  await realDoc.set({
    id: real.id,
    type: real.type,
    species: real.species,
  })
  await realInGiverHandDoc.delete()
  await giverHandCol.get().then(col => {
    giverDoc.update({ handNum: col.size })
  })
  await acceptorDoc.update({
    isAcceptor: true,
    canbeNominated: false,
  })
  await progressDoc.update({
    declare: declare,
    phase: 'accept',
  })
})

//パスからのgive専用関数
exports.giveOfPass = functions
  .region('asia-northeast1')
  .https.onCall(async (submission, context) => {
    console.log('============== giveOfPass ================')
    //------------------------- 準備↓ ----------------------------//
    let canContinue = true
    let real = {}
    let acceptor = {
      id: submission.acceptorId,
    }
    let giver = {
      id: context.auth.uid,
    }
    const roomId = submission.roomId
    const declare = submission.declare
    const commons = ['bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk']
    // firestoreRefs
    const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
    const giverHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${giver.id}/hand`)
    const giverDoc = fireStore.doc(`rooms/${roomId}/players/${giver.id}`)
    const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptor.id}`)
    const realInGiverHandDoc = fireStore.doc(
      `/rooms/${roomId}/invPlayers/${giver.id}/hand/${real.id}`
    )
    const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
    const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)
    await realDoc.get().then(doc => {
      real = doc.data()
    })
    //------------------------- 準備↑ ----------------------------//

    // ---バリデーション---//
    // phaseがpassか、関数発火者のisGiverがtrueか
    await progressDoc.get().then(doc => {
      const flag = doc.data().phase === 'pass'
      canContinue = canContinue && flag
    })
    await giverDoc.get().then(doc => {
      canContinue = canContinue && doc.data().isGiver
    })
    if (!canContinue) {
      console.log('phaseがpassではない、またはGiverによる実行ではありません')
      return
    }
    //選択されたplayerは受け手になれるか
    await acceptorDoc.get().then(doc => {
      canContinue = canContinue && doc.data().canbeNominated
    })
    if (!canContinue) {
      console.log('CANT BE ACCEPTOR')
      return
    }

    setAuthenticity(declare, real, authenticityDoc)

    await acceptorDoc.update({
      isAcceptor: true,
      canbeNominated: false,
    })
    await progressDoc.update({
      declare: declare,
      phase: 'accept',
    })
  })

//真偽を算出して保存する
function setAuthenticity(declare, real, authenticityDoc) {
  let authenticity = null
  if (real.type === 'yes') {
    if (declare === 'king') {
      authenticity = false
    } else {
      authenticity = true
    }
  } else if (real.type === 'no') {
    authenticity = false
  } else if (declare === 'king') {
    authenticity = real.type === 'king'
  } else {
    authenticity = real.species === declare
  }
  authenticityDoc.set({ authenticity: authenticity })
}

exports.surrender = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  let canContinue = true
  const loserHandRef = fireStore.collection(`/rooms/${roomId}/invPlayers/${context.auth.uid}/hand`)
  await loserHandRef.get().then(col => {
    canContinue = canContinue && col.size === 0 //手札0なら関数を進めていく
  })
  if (!canContinue) {
    console.log('負けではありません')
    return
  }
  stop(roomId, context.auth.uid, fireStore)
})

exports.pass = functions.region('asia-northeast1').https.onCall(async (roomId, context) => {
  console.log('-------------PASS-------------')
  let canContinue = true
  let canPass = false
  let secretReal = {} //クライアントへの送付用
  //firestore
  const roomDoc = fireStore.doc(`rooms/${roomId}`)
  const playersCol = fireStore.collection(`rooms/${roomId}/players`)
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${context.auth.uid}`)
  const acceptorInvDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${context.auth.uid}`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)

  //acceptフェーズであることの確認
  roomDoc.get().then(doc => {
    canContinue = canContinue && doc.data().phase === 'accept'
  })
  //発火者のisAcceptorはtrueか
  acceptorDoc.get().then(doc => {
    canContinue = canContinue && doc.data().isAcceptor
  })
  if (!canContinue) {
    console.log('acceptフェーズではない、またはpassした人が受け手ではない')
    return
  }
  //一人以上指名可であるかの確認
  await playersCol.get().then(col => {
    col.forEach(doc => {
      canPass = canPass || doc.data().canbeNominated
    })
  })
  if (!canPass) {
    console.log('cant pass')
    return
  }
  //secretRealをinvPlayers/uidに保存
  await realDoc.get().then(doc => {
    secretReal = doc.data()
  })
  acceptorInvDoc.set({ secretReal: secretReal })
  //受け手を出し手に、出し手のisGiverをfalseにする
  await playersCol
    .where('isGiver', '==', true) //出し手をクエリ
    .get()
    .then(col => {
      col.forEach(doc => {
        doc.ref.update({ isGiver: false })
      })
    })
  //次のステートへ
  acceptorDoc.update({ isGiver: true, isAcceptor: false })
  progressDoc.update({ phase: 'pass' })
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
//TODOburdens->accumulationsにする
exports.accumulate = functions.region('asia-northeast1').https.onCall((submission, context) => {
  //------------------------- 準備↓ ----------------------------//
  console.log('============================ACCUMULATE!================================')
  const roomId = submission.roomId
  const burdens = submission.accumulations //提出カード1or2枚
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
  if (burdens.length < 1 || burdens.length > 2) {
    console.log('1,2枚でないと溜められません')
    return //0枚、3枚以上の場合return
  }
  //yes,noが提出されている場合、はじく
  burdens.forEach(burden => {
    const flag = burden.type === 'yes' || burden.type === 'no'
    includeYesNo = includeYesNo || flag
  })
  if (includeYesNo) {
    console.log('yes/noは選択できません')
    return
  }
  //------------------------- バリデーション↑ ----------------------------//

  //1枚提出
  if (burdens.length < 2) {
    if (declare === 'king') {
      if (burdens[0].type === 'king') {
        accumulateSub(roomId, burdens, declare, uid, fireStore, admin)
        return
      } else {
        console.log('1枚のキングを溜めるか、キング以外で2枚溜めてください')
        return
      }
    } else {
      if (burdens[0].species === declare) {
        accumulateSub(roomId, burdens, declare, uid, fireStore, admin)
        return
      } else {
        console.log('宣言された物と同じ厄介者を溜めてください')
        return
      }
    }
  } else {
    //2枚提出
    if (declare === 'king') {
      if (burdens[0].type !== declare && burdens[1].type !== declare) {
        accumulateSub(roomId, burdens, declare, uid, fireStore, admin)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
      }
    } else {
      if (burdens[0].species !== declare && burdens[1].species !== declare) {
        accumulateSub(roomId, burdens, declare, uid, fireStore, admin)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
      }
    }
  }
})

//カード内容表示
// let speciesTotalStack = {
//   bat: 0,
//   crh: 0,
//   fly: 0,
//   frg: 0,
//   rat: 0,
//   spn: 0,
//   stk: 0,
// }
// let speciesTotalPena = {
//   bat: 0,
//   crh: 0,
//   fly: 0,
//   frg: 0,
//   rat: 0,
//   spn: 0,
//   stk: 0,
// }
// console.log(`------------stack------------`)
// for (i = 0; i < stack.length; i++) {
//   console.log(`${i}:${stack[i].id} ${stack[i].type}_${stack[i].species}`)
// }
// console.log(`------------stack------------`)
// for (i = 0; i < stack.length; i++) {
//   switch (stack[i].species) {
//     case 'bat':
//       speciesTotalStack.bat++
//       break
//     case 'crh':
//       speciesTotalStack.crh++
//       break
//     case 'fly':
//       speciesTotalStack.fly++
//       break
//     case 'frg':
//       speciesTotalStack.frg++
//       break
//     case 'rat':
//       speciesTotalStack.rat++
//       break
//     case 'spn':
//       speciesTotalStack.spn++
//       break
//     case 'stk':
//       speciesTotalStack.stk++
//       break
//   }
// }
// console.log(speciesTotalStack)
// console.log(`------------cards------------`)
// for (i = 0; i < cards.length; i++) {
//   console.log(`${i}:${cards[i].id} ${cards[i].type}_${cards[i].species}`)
// }
// console.log(`------------penalty------------`)
// for (i = 0; i < penalty.length; i++) {
//   switch (penalty[i].species) {
//     case 'bat':
//       speciesTotalPena.bat++
//       break
//     case 'crh':
//       speciesTotalPena.crh++
//       break
//     case 'fly':
//       speciesTotalPena.fly++
//       break
//     case 'frg':
//       speciesTotalPena.frg++
//       break
//     case 'rat':
//       speciesTotalPena.rat++
//       break
//     case 'spn':
//       speciesTotalPena.spn++
//       break
//     case 'stk':
//       speciesTotalPena.stk++
//       break
//   }
// }
// console.log(speciesTotalPena)
// }

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
