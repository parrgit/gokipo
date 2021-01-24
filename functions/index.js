const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

exports.addMessage = functions.https.onCall((data) => {
  const text = data
  return {
    text: text,
  }
})
