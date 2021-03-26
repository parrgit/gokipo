const { judge } = require('./judge.js')
const { stop } = require('./stop.js')
const { penaltyProcess } = require('./penaltyProcess.js')
require('array-foreach-async')

exports.accumulateSub = async (roomId, outBurdens, declare, uid, fireStore, admin) => {
  console.log('=================ACCUMULATE SUB FUNC=====================')
  //------------------------- 準備↓ ----------------------------//
  let sum = 0 //溜め手の手札枚数
  let turn = 0 //ターン数
  let canContinue = true
  let isAcceptor = false
  let loserBurden //judge用
  const burdens = outBurdens.slice() //とりあえずスライスして値渡し..?
  const accumArray = [] //burdenコレクションに溜める用array
  const hand = []
  const real = {}

  //firestore
  let giverSnap
  let playersSnap
  let accumulatorHandDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${uid}/hand/${real.id}`)
  const batch = fireStore.batch()
  const accumulatorDoc = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)

  //snapshot系
  const realDocSnapshot = fireStore.doc(`rooms/${roomId}/real/realDoc`).get()
  const accumulatorHandSnapshot = fireStore
    .collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
    .get()
  const penaltyTopDocSnapshot = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`).get()
  const accumulatorDocSnapshot = fireStore.doc(`/rooms/${roomId}/players/${uid}`).get()
  const giverSnapshot = fireStore
    .collection(`rooms/${roomId}/players`)
    .where('isGiver', '==', true)
    .get()
  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const progressDocSnapshot = fireStore.doc(`rooms/${roomId}/progress/progDoc`).get()

  await Promise.all([
    realDocSnapshot,
    accumulatorHandSnapshot,
    penaltyTopDocSnapshot,
    accumulatorDocSnapshot,
    giverSnapshot,
    playersSnapshot,
    progressDocSnapshot,
  ]).then(values => {
    real.id = values[0].data().id
    real.type = values[0].data().type
    real.species = values[0].data().species
    sum = values[1].size
    values[1].docs.forEach(doc => {
      const card = {
        id: doc.id,
        type: doc.data().type,
        species: doc.data().species,
      }
      hand.push(card) //手札配列hand[]作製
    })
    isPenaltyTop = values[2].data()
    isAcceptor = values[3].data().isAcceptor
    loserBurden = values[3].data().burden
    giverSnap = values[4]
    playersSnap = values[5]
    turn = values[6].data().turn
  })
  //------------------------- 準備↑ ----------------------------//

  // console.log(burdens) //todokesu

  // 手札から溜めるカードを削除(1,2枚)
  //burdens[]がpenaltyProcess()によってどうしても変わってしまうため、この位置とする（関数として問題なし）
  //TODO原因調査しましょう
  burdens.forEach(burden => {
    accumulatorHandDoc = fireStore.doc(`rooms/${roomId}/invPlayers/${uid}/hand/${burden.id}`)
    batch.delete(accumulatorHandDoc)
  })

  //手札0枚
  if (sum < 1) {
    stop(roomId, uid, null, fireStore, admin)
    return
  }

  //----------------- hand[]にburdens(1or2枚)があるかチェック↓ -------------------------------
  //ループを抜けやすくするためにarray.someを使用(for文の方がいいとの情報もあり)
  burdens.some(burden => {
    let index = 0 //findIndex用

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
      //hand[]に提出カードなし→負け
      stop(roomId, uid, null, fireStore, admin)
      canContinue = false
      return true //burdens.someを抜ける
    }

    hand.splice(index, 1) //burdensが2枚でhandに1枚しかdeclareがない場合に必要
  })
  if (!canContinue) {
    console.log('手札に提出カードが揃っていません')
    return
  }
  //------------------------------- チェック↑ --------------------------------------------

  //1枚ずつburden保存（最大2枚）
  //1枚ずつ順番に溜めていきたいため、await forEachAsyncで実行
  await burdens.forEachAsync(async burden => {
    accumArray.push(Object.assign({}, burden)) //溜める用arrayにプッシュ、値渡し

    //penaltyTopが無い時はpenaltyProcessを実行しない
    if (isPenaltyTop) {
      while (burden.type === 'king') {
        burden = await penaltyProcess(roomId, fireStore)
        accumArray.push(Object.assign({}, burden)) //溜める用arrayにプッシュ、値渡し
        // console.log('while!!', burdens) //todokesu
      }
    }
  })

  batch.update(accumulatorDoc, { burden: admin.firestore.FieldValue.arrayUnion(...accumArray) })

  //負け手のburdenを解析し、負け条件を満たしていないか判定
  const judgeBurden = loserBurden.concat(accumArray) //judge用、初期値＋今回溜めるもの達
  canContinue = await judge(roomId, uid, judgeBurden, accumArray, fireStore, admin) //========== JUDGE ==========
  if (!canContinue) return //judgeからfalseが返ってきたらaccumulate終了

  if (isAcceptor) {
    // 受け手を出し手に、出し手のisGiverをfalseにする
    batch.update(giverSnap.docs[0].ref, { isGiver: false })
    batch.update(accumulatorDoc, { isGiver: true, isAcceptor: false })
  }

  // yes / noカードをaccumulatorの手札に入れ込む
  batch.set(accumulatorHandDoc, { type: real.type, species: real.species }) //type: yes/no, species: yes/no

  //全プレイヤー情報を更新
  playersSnap.docs.forEach(doc => {
    batch.update(doc.ref, { canbeNominated: true, isAcceptor: false })
  })

  //accumulatorの各項目を更新
  batch.update(accumulatorDoc, {
    isYesNoer: false,
    canbeNominated: false,
    handNum: sum - burdens.length + 1, //yes/noで +1、burdensで -burdens.length
  })

  //フェーズとターン数更新
  batch.update(progressDoc, {
    phase: 'give',
    turn: turn + 1,
  })

  batch.commit()
}
