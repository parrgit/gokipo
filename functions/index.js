const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

var fireStore = admin.firestore()

// exports.addMessage = functions.https.onCall(data => {
//   const text = data
//   return {
//     text: text,
//   }
// })

// サーバーでfirestoreから取得できているか確認
// exports.getFirestore = functions.https.onCall(() => {
//   let reference = fireStore.collection(
//     '/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference'
//   )
//   reference
//     .orderBy('species')
//     .orderBy('num')
//     .get()
//     .then(snapshot => {
//       snapshot.forEach(doc => {
//         console.log(doc.id, ' => ', doc.data().species, doc.data().num, doc.data().type)
//       })
//     })
// })

// firestoreからrefference取得→配列に入れ込んでクライアントに送付
// returnをonCall関数の最後に書く決まりなので、thenの中にかけない
// つまり非同期処理(reference.get()..)を飛ばしてstackを返してしまう
// ということでasync、awaitをいい感じに入れ込む
exports.initStack = functions.https.onCall( async () => {
  const stack = []
  let reference = fireStore.collection(
    '/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference'
  )
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
    return{
      stack
    }
})
