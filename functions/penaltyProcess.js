//←burden(real)←penaltyTop←penaltyBody[0]←penaltyBody[1]←..
exports.penaltyProcess = async (roomId, fireStore) => {
  //------------------------- 準備↓ ----------------------------//
  console.log('=========== PENALTY PROCESS↓ ==========')
  const penaltyBodyTop = {} //penaltyBodyコレクションの最上(num===0)
  const burden = {}
  let penaltyBodyTopDocRef //delete用
  let penaltyBodySnap = null

  //firestore
  const batch = fireStore.batch()
  const penaltyTopDocRef = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
  const penaltyTopDocSnapshot = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`).get()
  const penaltyBodySnapshot = fireStore.collection(`/rooms/${roomId}/penaltyBody`).get()
  const penaltyBodySnapshot_top = fireStore
    .collection(`/rooms/${roomId}/penaltyBody`)
    .where('num', '==', 0)
    .get()
  //------------------------- 準備↑ ----------------------------//

  await Promise.all([penaltyTopDocSnapshot, penaltyBodySnapshot_top, penaltyBodySnapshot]).then(
    values => {
      // ①burden(real)←penaltyTop
      burden.id = values[0].data().id
      burden.type = values[0].data().type
      burden.species = values[0].data().species

      // ②penaltyTop←penaltyBody[0]
      if (values[1].docs[0]) {
        penaltyBodyTop.id = values[1].docs[0].id
        penaltyBodyTop.type = values[1].docs[0].data().type
        penaltyBodyTop.species = values[1].docs[0].data().species
        penaltyBodyTop.bodyNum = values[2].size - 1 //penaltyBodyの枚数

        penaltyBodyTopDocRef = values[1].docs[0].ref //top delete用

        penaltyBodySnap = values[2].docs //bodyのnum調整用
      }
    }
  )

  if (Object.keys(penaltyBodyTop).length) {
    //penaltyBodyコレクションにdocが存在していれば以下を実行

    // ②penaltyTop←penaltyBody[0]
    batch.set(penaltyTopDocRef, penaltyBodyTop)

    // ③penaltyBodyのnumを調整(-1)
    penaltyBodySnap.forEach(doc => {
      batch.update(doc.ref, { num: doc.data().num - 1 })
    })

    // ⓪penaltyBodyコレクションの一番上(この時点でnum===-1)を削除
    // batch処理の順番的にこの位置で実行しなければならない
    batch.delete(penaltyBodyTopDocRef)
  } else {
    //penaltyの最後の1枚を削除
    batch.delete(penaltyTopDocRef)
  }

  await batch.commit() //await必要、無い場合2重にpenaltyProcessが回り、参照エラーを吐く（1順目でdeleteしたものを参照しにいくため？）

  return burden
}
