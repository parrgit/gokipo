exports.stop = async (roomId, uid, fireStore) => {
  console.log('STOP!')
  const progressRef = fireStore.doc(`/rooms/${roomId}/progress/progDoc`)
  const players = fireStore.collection(`/rooms/${roomId}/players`)
  const loser = fireStore.doc(`/rooms/${roomId}/players/${uid}`)

  progressRef.get().then(doc => {
    doc.ref.set({ phase: 'waiting', declare: '', turn: 0 })
  })
  players.get().then(col => {
    col.forEach(doc => {
      doc.ref.update({ isReady: false })
    })
  })
  loser.get().then(doc => {
    doc.ref.update({ isLoser: true })
  })
}
