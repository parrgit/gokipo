const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

var fireStore = admin.firestore()
var _ = require('lodash')

// async、awaitをいい感じに入れ込む ↓理由
// firestoreからreference取得→配列に入れ込んでクライアントに送付
// returnをonCall関数の最後に書く決まりなので、thenの中にかけない
// つまり非同期処理(reference.get()..)を飛ばしてstackを返してしまう null
exports.initStack = functions.https.onCall(async () => {
  const stack = []
  let reference = fireStore.collection('/reference')
  await reference
    // .orderBy('species')
    // .orderBy('num')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        // stack.push({ type: doc.data().type, species: doc.data().species })
        stack.push({ species: doc.data().species })
      })
    })
  console.log(stack)
  return {
    stack,
  }
})

// サーバー側でリッスンの例           【現時点では使わない】
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

//TODO gamestart関数(onCallable)
exports.gameStart = functions.https.onCall(async roomId => {
  console.log('----------GAME START!----------')
  const room = fireStore.doc(`rooms/${roomId}`)
  const progress = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  await progress.get().then(doc => {
    if (doc.data().phase !== 'waiting') return
  })
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
    // coll.forEach(doc => {
    //   if (doc.data().isReady === false) return //TODO後で使う
    // })
    gameStart_cardDistribution(sum)
  })
})

async function gameStart_cardDistribution(sum) {
  let stack = []
  const cards = []
  let speciesTotalStack = {
    bat: 0,
    crh: 0,
    fly: 0,
    frg: 0,
    rat: 0,
    spn: 0,
    stk: 0,
  }
  let speciesTotalPena = {
    bat: 0,
    crh: 0,
    fly: 0,
    frg: 0,
    rat: 0,
    spn: 0,
    stk: 0,
  }
  let reference = fireStore.collection('/reference')
  await reference
    .get()
    .then(coll => {
      coll.forEach(doc => {
        stack.push({ id: doc.id, type: doc.data().type, species: doc.data().species })
      })
    })
  stack = _.shuffle(stack)
  //7+(全数%プレイヤー数)
  for (i = 6 + ((stack.length - 7) % sum); i >= 0; i--) {
    while (stack[i].type === 'yes' || stack[i].type === 'no') {
      console.log('YES! NO!')
      stack = _.shuffle(stack)
    }
    cards.push(...stack.splice(i, 1))
  }

  // console.log(`------------stack------------`)
  // for (i = 0; i < stack.length; i++) {
  //   console.log(`${i}:${stack[i].id} ${stack[i].type}_${stack[i].species}`)
  // }
  console.log(`------------stack------------`)
  for (i = 0; i < stack.length; i++) {
    switch (stack[i].species) {
      case 'bat':
        speciesTotalStack.bat++
        break
      case 'crh':
        speciesTotalStack.crh++
        break
      case 'fly':
        speciesTotalStack.fly++
        break
      case 'frg':
        speciesTotalStack.frg++
        break
      case 'rat':
        speciesTotalStack.rat++
        break
      case 'spn':
        speciesTotalStack.spn++
        break
      case 'stk':
        speciesTotalStack.stk++
        break
    }
  }
  console.log(speciesTotalStack)
  // console.log(`------------cards------------`)
  // for (i = 0; i < cards.length; i++) {
  //   console.log(`${i}:${cards[i].id} ${cards[i].type}_${cards[i].species}`)
  // }
  console.log(`------------penalty------------`)
  for (i = 0; i < cards.length; i++) {
    switch (stack[i].species) {
      case 'bat':
        speciesTotalPena.bat++
        break
      case 'crh':
        speciesTotalPena.crh++
        break
      case 'fly':
        speciesTotalPena.fly++
        break
      case 'frg':
        speciesTotalPena.frg++
        break
      case 'rat':
        speciesTotalPena.rat++
        break
      case 'spn':
        speciesTotalPena.spn++
        break
      case 'stk':
        speciesTotalPena.stk++
        break
    }
  }
  console.log(speciesTotalPena)
}
