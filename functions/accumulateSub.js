const { judge } = require('./judge.js')
const { stop } = require('./stop.js')
const { penaltyProcess } = require('./penaltyProcess.js')

exports.accumulateSub = async (roomId, burdens, declare, uid, fireStore, admin) => {
  console.log('=================ACCUMULATE SUB FUNC=====================')
  //------------------------- 準備↓ ----------------------------//
  let sum = 0
  let canContinue = true
  let isAcceptor = false
  const hand = []
  const real = {}
  //firestore
  const playersCol = fireStore.collection(`rooms/${roomId}/players`)
  const accumulatorDoc = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
  const accumulatorHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  await realDoc.get().then(doc => {
    real.id = doc.id
    real.type = doc.data().type
    real.species = doc.data().species
  })
  let accumulatorHandDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${uid}/hand/${real.id}`)
  //------------------------- 準備↑ ----------------------------//

  //手札測定
  await accumulatorHandCol.get().then(col => {
    sum = col.size
  })
  //手札0枚
  if (sum < 1) {
    stop(roomId, uid, fireStore)
    return
  }

  //手札配列hand[]作製
  await accumulatorHandCol.get().then(col => {
    col.docs.forEach(async doc => {
      const card = {
        id: doc.id,
        type: doc.data().type,
        species: doc.data().species,
      }
      hand.push(card)
    })
  })
  //hand[]にburdens(1or2枚)があるか
  //ループを抜けやすくするためにarray.someを使用(for文の方がいいとの情報もあり)
  burdens.some(burden => {
    let index = 0
    if (declare === 'king') {
      index = hand.findIndex(card => {
        return card.type === burden.type
      })
    } else {
      index = hand.findIndex(card => {
        return card.species === burden.species
      })
    }
    if (index === -1) {
      //hand[]に提出カードなし
      stop(roomId, uid, fireStore)
      canContinue = false
      return true //burdens.someを抜ける
    }
    hand.splice(index, 1) //burdensが2枚でhandに1枚しかdeclareがない場合に必要
  })
  if (!canContinue) {
    console.log('手札に提出カードが揃っていません')
    return
  }

  //1枚ずつburden保存（最大2枚）
  await burdens.forEachAsync(async burden => {
    //player(uid)/burdenにセット
    await accumulatorDoc.get().then(async doc => {
      await doc.ref.update({ burden: admin.firestore.FieldValue.arrayUnion(burden) })
    })
    //kingである限りpenaltyTopからburdenに保存し続ける
    //TODOwhile内でエラーあり（原因特定できておらず
    while (burden.type === 'king') {
      //KINGをセット
      burden = await penaltyProcess(burden, roomId, fireStore)
      await accumulatorDoc.get().then(async doc => {
        await doc.ref.update({ burden: admin.firestore.FieldValue.arrayUnion(burden) })
      })
    }
  })

  canContinue = await judge(roomId, uid, fireStore)
  if (!canContinue) return //judgeからfalseが返ってきたらanswer終了

  await accumulatorDoc.get().then(doc => {
    isAcceptor = doc.data().isAcceptor
  })
  if (isAcceptor) {
    //受け手を出し手に、出し手のisGiverをfalseにする
    await playersCol
      .where('isGiver', '==', true) //出し手をクエリ
      .get()
      .then(col => {
        col.forEach(async doc => {
          await doc.ref.update({ isGiver: false })
        })
      })
    await accumulatorDoc.update({ isGiver: true, isAcceptor: false })
  }
  //yes/noカードをaccumulatorのhandに入れ込む
  await accumulatorHandDoc.set({ type: real.type, species: real.species }) //type: yes/no, species: yes/no
  //手札から溜めるカードを削除(1,2枚)
  burdens.forEach(async burden => {
    accumulatorHandDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${uid}/hand/${burden.id}`)
    await accumulatorHandDoc.get().then(doc => {
      doc.ref.delete() //todo batch処理
    })
  })
  //handNumを更新
  //todo 通信しないようにする
  await accumulatorHandCol.get().then(col => {
    accumulatorDoc.update({ handNum: col.size })
  })
  //全プレイヤー情報を更新
  await playersCol.get().then(col => {
    col.forEach(doc => {
      doc.ref.update({ canbeNominated: true, isAcceptor: false })
    })
  })
  //accumulatorのisYesNoerをfalseに、次turnのgiverになるためcanbeNominatedをfalseに
  //以下awaitつけない
  accumulatorDoc.get().then(doc => {
    doc.ref.update({ isYesNoer: false, canbeNominated: false })
  })
  progressDoc.get().then(doc => {
    doc.ref.update({
      phase: 'give',
      turn: doc.data().turn + 1,
    })
  })
}
