exports.stop = async (roomId, uid, accumArray, fireStore, admin) => {
  console.log('STOP!')
  const batch = fireStore.batch()
  const progressRef = fireStore.doc(`/rooms/${roomId}/progress/progDoc`)
  const loserDocRef = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
  const playersSnapshot = await fireStore.collection(`/rooms/${roomId}/players`).get()

  batch.set(progressRef, { phase: 'waiting', declare: '', turn: 0 })
  playersSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { isReady: false, canbeNominated: true })
  })
  batch.update(loserDocRef, { isLoser: true })

  if (accumArray) {
    batch.update(loserDocRef, { burden: admin.firestore.FieldValue.arrayUnion(...accumArray) }) //burdenを更新
  }

  batch.commit()
}
