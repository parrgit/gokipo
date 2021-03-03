const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

var fireStore = admin.firestore()
var _ = require('lodash')

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

exports.gameStart = functions.https.onCall(async roomId => {
  console.log('----------GAME START!----------')
  const room = fireStore.doc(`rooms/${roomId}`)
  const progress = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  let allReady = true
  let canContinue = true
  await progress.get().then(doc => {
    const flag = doc.data().phase === 'waiting'
    canContinue = canContinue && flag
  })
  if (!canContinue) {
    console.log('THE GAME HAS ALREADY START')
  }
  let sum = 0 //プレイヤー数
  await players.get().then(coll => {
    coll.forEach(() => {
      sum++
    })
  })
  await room.get().then(doc => {
    const minNumber = doc.data().minNumber
    const maxNumber = doc.data().maxNumber
    if (!(sum >= minNumber && sum <= maxNumber)) return
  })
  await players.get().then(coll => {
    coll.forEach(doc => {
      allReady = allReady && doc.data().isReady //TODO後で使う
    })
  })
  if (!allReady) return
  gameStart_cardDistribution(sum, roomId)
  gameStart_determineGiver(roomId, players)
  phaseSet(roomId, 'give')
})

async function gameStart_cardDistribution(sum, roomId) {
  let stack = [] //山札
  let handLength = 0 //各プレーヤーの手札枚数
  let penaltySum = 0 //確認用
  const penalties = [] //ペナルティ
  const hands = []
  const reference = fireStore.collection('/reference')
  const penaltyTopDoc = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
  const penaltyBodyCol = fireStore.collection(`/rooms/${roomId}/penaltyBody`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  //stackにreferenceを入れ込む
  await reference.get().then(col => {
    col.docs.forEach(doc => {
      stack.push({
        id: doc.id,
        type: doc.data().type,
        species: doc.data().species,
      })
    })
  })
  //stackをシャッフル
  stack = _.shuffle(stack)
  // [penalty] 作成 stackから 7+(全数%プレイヤー数)枚入れ込む
  for (let i = 6 + ((stack.length - 7) % sum); i >= 0; i--) {
    //TODO7をPENALTY（定数）などにする
    while (stack[i].type === 'yes' || stack[i].type === 'no') {
      stack = _.shuffle(stack)
    }
    penalties.push(...stack.splice(i, 1))
  }
  // [penalty] Save 枚数が合うまで回す
  // 経緯 batch処理✗ -> for文✗ -> firestore直接確認して枚数あってなければもう一度やる方式にする
  while (penaltySum < 6) {
    penaltySum = 0
    await penaltySave(roomId, penalties, penaltyBodyCol, penaltyTopDoc) //Save
    // 確認
    await penaltyBodyCol.get().then(col => {
      col.forEach(() => {
        penaltySum++
      })
    })
  }
  // [hand] 作成 残りのstackからstack/sum枚ずつ入れ込む
  handLength = stack.length / sum
  for (let i = 0; i < sum; i++) {
    const hand = []
    for (let j = 0; j < handLength; j++) {
      const splice = stack.splice(0, 1)[0]
      const card = {
        id: splice.id,
        type: splice.type,
        species: splice.species,
      }
      hand.push(card)
    }
    hands.push(hand)
  }
  //Save 枚数が合うまで回す
  players.get().then(col => {
    //colはobjectなのでforEachでindexを取得できない → col.docsは配列なのでindex取得可◎
    col.docs.forEach(async (doc, i) => {
      let handSum = 0 //確認用、ローカル変数である必要あり
      while (handSum < handLength) {
        handSum = 0
        await handsSave(roomId, doc.id, hands[i]) // [hand] Save
        // 確認
        const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${doc.id}/hand`)
        await handCol.get().then(col => {
          col.forEach(() => {
            handSum++
          })
        })
      }
      // 各プレーヤーにhandNumをセットする
      const playerRef = fireStore.doc(`/rooms/${roomId}/players/${doc.id}`)
      await playerRef.update({ handNum: handSum })
    })
  })
}

async function penaltySave(roomId, penalties, penaltyBodyCol, penaltyTopDoc) {
  var batch = fireStore.batch()
  //まずpenaltyコレクションを初期化
  await penaltyBodyCol.get().then(col => {
    col.forEach(doc => {
      doc.ref.delete()
    })
  })
  //Save
  penalties.forEach((penalty, i) => {
    const penaltyBodyDoc = fireStore.doc(`/rooms/${roomId}/penaltyBody/${penalty.id}`)
    if (i > 0) {
      batch.set(penaltyBodyDoc, { type: penalty.type, species: penalty.species })
    } else {
      batch.set(penaltyTopDoc, {
        id: penalty.id,
        type: penalty.type,
        species: penalty.species,
      })
    }
  })
  await batch.commit()
}

async function handsSave(roomId, uid, hand) {
  var batch = fireStore.batch()
  const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
  //まずhandコレクションを初期化
  await handCol.get().then(col => {
    col.forEach(doc => {
      doc.ref.delete()
    })
  })
  //Save
  hand.forEach(card => {
    const cardRef = fireStore.doc(`/rooms/${roomId}/invPlayers/${uid}/hand/${card.id}`)
    batch.set(cardRef, { type: card.type, species: card.species })
  })
  await batch.commit()
}

async function gameStart_determineGiver(roomId, players) {
  const playerIDs = []
  await players.get().then(col => {
    col.docs.forEach(doc => {
      playerIDs.push(doc.id)
    })
  })
  const random = Math.floor(playerIDs.length * Math.random())
  const firstPlayerID = playerIDs.splice(random, 1)
  const firstPlayerDoc = fireStore.doc(`/rooms/${roomId}/players/${firstPlayerID}`)
  firstPlayerDoc.update({ isGiver: true, canbeNominated: false })
}

function phaseSet(roomId, phase) {
  progress = fireStore.doc(`/rooms/${roomId}/progress/progDoc`)
  progress.update({
    phase: phase,
  })
}

exports.give = functions.https.onCall(async (submission, context) => {
  console.log('==============give================')
  let giversCardSum = 0
  let canContinue = true
  let acceptor = {
    id: submission.acceptorId,
  }
  let giver = {
    id: context.auth.uid,
  }
  const roomId = submission.roomId
  const real = submission.real //{id: type: species:}
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

  //---バリデーション---//
  //phaseがgiveか、関数発火者のisGiverがtrueか
  await progressDoc.get().then(doc => {
    const flag = doc.data().phase === 'give'
    canContinue = canContinue && flag
  })
  await giverDoc.get().then(doc => {
    const flag = doc.data().isGiver === true
    canContinue = canContinue && flag
  })
  if (!canContinue) return
  //手札存在するか
  await giverHandCol.get().then(col => {
    col.docs.forEach(() => {
      giversCardSum++
    })
  })
  if (giversCardSum < 1) {
    stop()
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
  await acceptorDoc.update({
    isAcceptor: true,
    canbeNominated: false,
  })
  await progressDoc.update({
    declare: declare,
    phase: 'accept',
  })
})

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

function stop() {
  console.log('STOP!')
  return
}

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
