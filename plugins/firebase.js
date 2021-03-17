import firebase from 'firebase/app'
import 'firebase/firestore'
import 'firebase/auth'
import 'firebase/storage'
import 'firebase/functions'
import config from '~/firebaseConfig.json'

if (!firebase.apps.length) {
  firebase.initializeApp({ ...config })
}

export default ({ app }, inject) => {
  inject('firebase', firebase)
  inject('firestore', firebase.firestore())
  inject('fireAuth', firebase.auth())
  inject('fireStorage', firebase.storage())
  inject('fireFunc', firebase.functions())
}

// TODO最終的に消す
// const functions = firebase.functions()
// functions.useFunctionsEmulator('http://localhost:5000')
