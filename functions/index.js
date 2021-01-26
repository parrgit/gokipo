const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

var fireStore = admin.firestore()

exports.addMessage = functions.https.onCall(data => {
  const text = data
  return {
    text: text,
  }
})

exports.getFirestore = functions.https.onCall
let reference = fireStore.collection(
  '/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference'
)
reference.get().then(snapshot => {
  snapshot
    .forEach(doc => {
      console.log(doc.id, ' => ', doc.data().species, doc.data().num, doc.data().type)
    })
    .catch(error => {
      console.log('error getting documents: ', error)
    })
})
