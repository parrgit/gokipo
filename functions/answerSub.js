const { judge } = require('./judge.js')
const { stop } = require('./stop.js')
const { penaltyProcess } = require('./penaltyProcess.js')

exports.answerSub = async (roomId, outReal, declare, loserId, loser, giverId, fireStore, admin) => {
  console.log('=========== ANSWER SUB FUNC ==============')
  //------------------------- 準備↓ ----------------------------//
  let handNum = 0 //負け手の手札枚数
  let oneHandType = '' //oneHandType: 負け手の手札が1枚のときに使うtype
  let oneHandSpecies = '' //oneHandSpecies: 負け手の手札が1枚のときに使うspecies
  let canContinue = true //関数を進められるかのflag
  let turn //ターン数
  let playersSnap //プレイヤーコレクションのsnapshot
  let isPenaltyTop //penaltyProcessに入るか判定用
  let real = outReal
  let loserBurden //judge用
  let secretReal //yes/no可視化用
  const realArray = []

  //firestore
  const batch = fireStore.batch()
  const progressDocRef = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const loserDocRef = fireStore.doc(`rooms/${roomId}/players/${loserId}`)
  const giverDocRef = fireStore.doc(`rooms/${roomId}/players/${giverId}`) //受け手を出し手に変更する際に使用

  const progressDocSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()
  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const loserHandSnapshot = fireStore.collection(`rooms/${roomId}/invPlayers/${loserId}/hand`).get()
  const penaltyTopDocSnapshot = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`).get()
  const loserDocSnapshot = fireStore.doc(`rooms/${roomId}/players/${loserId}`).get()
  const realDocSnapshot = fireStore.doc(`rooms/${roomId}/real/realDoc`).get()

  //getは最初にまとめてしておく、transactionを使用せずbatch処理をしたいという思惑
  await Promise.all([
    loserHandSnapshot,
    playersSnapshot,
    progressDocSnapshot,
    penaltyTopDocSnapshot,
    loserDocSnapshot,
    realDocSnapshot,
  ]).then(values => {
    handNum = values[0].size
    oneHandType = values[0].docs[0].data().type
    oneHandSpecies = values[0].docs[0].data().species
    playersSnap = values[1].docs
    turn = values[2].data().turn
    isPenaltyTop = values[3].data()
    loserBurden = values[4].data().burden
    secretReal = values[5].data()
  })
  //------------------------- 準備↑ ----------------------------//

  if (real.type === 'yes' || real.type === 'no') {
    if (handNum < 1 || !handNum) {
      //手札0枚（surrender関数に誘導されるので、ここには通常来ない）
      stop(roomId, loserId, null, fireStore, admin)
      return
    } else if (handNum === 1) {
      //手札1枚（稀に発生）
      //king
      if (declare === 'king') {
        if (oneHandType === 'king') {
          // yes/noを全員可視化@secretRealを利用
          playersSnap.forEach(player => {
            const invPlayerRef = fireStore.doc(`rooms/${roomId}/invPlayers/${player.id}`)
            batch.set(invPlayerRef, { secretReal: secretReal })
          })
          batch.update(loserDocRef, { isYesNoer: true })
          batch.update(progressDocRef, { phase: 'yesno' })
        } else {
          stop(roomId, loserId, null, fireStore, admin)
          return
        }
        //common
      } else {
        if (oneHandSpecies === declare) {
          // yes/noを全員可視化@secretRealを利用
          playersSnap.forEach(player => {
            const invPlayerRef = fireStore.doc(`rooms/${roomId}/invPlayers/${player.id}`)
            batch.set(invPlayerRef, { secretReal: secretReal })
          })
          batch.update(loserDocRef, { isYesNoer: true })
          batch.update(progressDocRef, { phase: 'yesno' })
        } else {
          stop(roomId, loserId, null, fireStore, admin)
          return
        }
      }
    } else if (handNum > 1) {
      // 手札2枚以上（yesnoの場合、ほぼほぼここに誘導される）

      // yes/noを全員可視化@secretRealを利用
      playersSnap.forEach(player => {
        const invPlayerRef = fireStore.doc(`rooms/${roomId}/invPlayers/${player.id}`)
        batch.set(invPlayerRef, { secretReal: secretReal })
      })
      batch.update(loserDocRef, { isYesNoer: true })
      batch.update(progressDocRef, { phase: 'yesno' })
    }
  } else {
    // realがYES NO以外（大体ここに誘導される）

    realArray.push(Object.assign({}, real)) //1枚目の、burdenに溜める厄介者、値渡し

    if (isPenaltyTop) {
      while (real.type === 'king') {
        // KINGをセット
        real = await penaltyProcess(roomId, fireStore)
        realArray.push(Object.assign({}, real))
      }
    }

    //後にjudgeするため、batch処理してはいけない
    batch.update(loserDocRef, { burden: admin.firestore.FieldValue.arrayUnion(...realArray) })

    //負け手のburdenを解析し、負け条件を満たしていないか判定
    const judgeBurden = loserBurden.concat(realArray) //judge用、溜めた後の厄介ゾーンで判定
    canContinue = await judge(roomId, loserId, judgeBurden, realArray, fireStore, admin) //========== JUDGE ==========

    if (!canContinue) return //judgeからfalseが返ってきたらanswer終了

    //受け手が負けの場合、受け手を出し手に変更
    if (loser === 'acceptor') {
      batch.update(loserDocRef, { isGiver: true })
      batch.update(giverDocRef, { isGiver: false })
    }

    //players情報の更新
    playersSnap.forEach(playerDoc => {
      batch.update(playerDoc.ref, {
        canbeNominated: true,
        isAcceptor: false,
      })
    })

    //負け手のcanbeNominatedをfalseに（次ターンgiverになるため）
    batch.update(loserDocRef, { canbeNominated: false })

    //phaseをgiveにする
    batch.update(progressDocRef, { phase: 'give', turn: turn + 1 })
  }
  batch.commit()
}
