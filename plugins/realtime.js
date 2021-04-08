export default async ({ app }) => {
  // Fetch the current user's ID from Firebase Authentication.

  function auth() {
    return new Promise(resolve => {
      app.$fireAuth.onAuthStateChanged(auth => {
        resolve(auth || null)
      })
    })
  }

  const user = await auth()
  if (!user) return
  const uid = user.uid || null
  if (!uid) return

  // Create a reference to this user's specific status node.
  // This is where we will store data about being online/offline.
  var userStatusDatabaseRef = app.$fireReal.ref('/status/' + uid)

  // We'll create two constants which we will write to
  // the Realtime database when this device is offline
  // or online.
  var isOfflineForDatabase = {
    internet: 'offline',
    last_changed: app.$firebase.database.ServerValue.TIMESTAMP,
  }

  var isOnlineForDatabase = {
    internet: 'online',
    last_changed: app.$firebase.database.ServerValue.TIMESTAMP,
  }

  // Create a reference to the special '.info/connected' path in
  // Realtime Database. This path returns `true` when connected
  // and `false` when disconnected.
  app.$fireReal.ref('.info/connected').on('value', function(snapshot) {
    // If we're not currently connected, don't do anything.
    if (snapshot.val() == false) {
      return
    }

    // If we are currently connected, then use the 'onDisconnect()'
    // method to add a set which will only trigger once this
    // client has disconnected by closing the app,
    // losing internet, or any other means.
    userStatusDatabaseRef
      .onDisconnect()
      .set(isOfflineForDatabase)
      .then(function() {
        // The promise returned from .onDisconnect().set() will
        // resolve as soon as the server acknowledges the onDisconnect()
        // request, NOT once we've actually disconnected:
        // https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect

        // We can now safely set ourselves as 'online' knowing that the
        // server will mark us as offline once we lose connection.
        userStatusDatabaseRef.set(isOnlineForDatabase)
      })
  })

  // =================================== ローカルに同期 ===================================
  //オフライン デバイスの Cloud Firestore キャッシュに同期して、それがオフラインであることをアプリが認識できるようにします。
  var userStatusFirestoreRef = app.$firestore.doc('/status/' + uid)

  // Firestore uses a different server timestamp value, so we'll
  // create two more constants for Firestore internet.
  var isOfflineForFirestore = {
    internet: 'offline',
    last_changed: app.$firebase.firestore.FieldValue.serverTimestamp(),
  }

  var isOnlineForFirestore = {
    internet: 'online',
    last_changed: app.$firebase.firestore.FieldValue.serverTimestamp(),
  }

  app.$fireReal.ref('.info/connected').on('value', function(snapshot) {
    if (snapshot.val() == false) {
      // Instead of simply returning, we'll also set Firestore's internet
      // to 'offline'. This ensures that our Firestore cache is aware
      // of the switch to 'offline.'
      userStatusFirestoreRef.set(isOfflineForFirestore)
      return
    }

    userStatusDatabaseRef
      .onDisconnect()
      .set(isOfflineForDatabase)
      .then(function() {
        userStatusDatabaseRef.set(isOnlineForDatabase)

        // We'll also add Firestore set here for when we come online.
        userStatusFirestoreRef.set(isOnlineForFirestore)
      })
  })
}
