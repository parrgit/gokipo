const { reference } = require('./reference.js') //山札
const _ = require('lodash')

//カード配布関数
exports.cardDistribution = async (playersNum, roomId, fireStore) => {
  //------------------------- 準備↓ ----------------------------//
  const batch = fireStore.batch()
  let handLength = 0 //各プレーヤーの手札枚数
  let penaltyLength // ≒7
  let stack = reference //山札
  const PENALTY = 7
  const penalties = [] //ペナルティ
  const hands = []
  //firestore
  let playersSnap
  let penaltyBodySnap
  const penaltyTopDoc = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)

  const playersSnapshot = fireStore.collection(`rooms/${roomId}/players`).get()
  const penaltyBodySnapshot = fireStore.collection(`/rooms/${roomId}/penaltyBody`).get()

  await Promise.all([playersSnapshot, penaltyBodySnapshot]).then(values => {
    playersSnap = values[0] //playerコレクションのsnapshot
    penaltyBodySnap = values[1] //penaltyBodyのsnapshot
  })
  //------------------------- 準備↑ ----------------------------//

  //stackをシャッフル
  stack = _.shuffle(stack)

  //penaltyの枚数を決定 通常7枚
  penaltyLength = PENALTY + ((stack.length - PENALTY) % playersNum)

  // ①[penalty] 作成
  // stackから抜き出す 7+(全数%プレイヤー数)枚
  for (let i = penaltyLength - 1; i >= 0; i--) {
    while (stack[i].type === 'yes' || stack[i].type === 'no') {
      stack = _.shuffle(stack)
    }
    penalties.push(...stack.splice(i, 1))
  }

  // ②[hand] 作成
  // (stack - penalty) 枚のstackからstack/sum枚ずつ入れ込む
  handLength = stack.length / playersNum

  for (let i = 0; i < playersNum; i++) {
    //一人ずつhandを作成
    const hand = []
    for (let j = 0; j < handLength; j++) {
      const splice = stack.splice(0, 1)[0]
      const card = {
        id: splice.id,
        type: splice.type,
        species: splice.species,
      }
      hand.push(card)
    }
    hands.push(hand)
  }

  // ③[hand] Save
  playersSnap.docs.forEach(async (doc, i) => {
    const batch = fireStore.batch() //ローカル変数である必要あり
    const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${doc.id}/hand`)

    // [hand] データベース初期化
    await handCol.get().then(col => {
      col.forEach(doc => {
        batch.delete(doc.ref) //batch.deleteにすることによって枚数を安定して配れるように..!!!
      })
    })

    // [hand] Save
    hands[i].forEach(card => {
      const cardRef = fireStore.doc(`/rooms/${roomId}/invPlayers/${doc.id}/hand/${card.id}`)
      batch.set(cardRef, { type: card.type, species: card.species })
    })

    // [hand] 各プレーヤーにhandNumをセットする
    const playerRef = fireStore.doc(`/rooms/${roomId}/players/${doc.id}`)
    batch.update(playerRef, { handNum: handLength })

    batch.commit()
  })

  // [penalty] データベース初期化
  penaltyBodySnap.docs.forEach(doc => {
    batch.delete(doc.ref) //batch.deleteにすることによって枚数を安定して配れる
  })

  // ④[penalty] Save
  penalties.forEach((penalty, i) => {
    const penaltyBodyDoc = fireStore.doc(`/rooms/${roomId}/penaltyBody/${penalty.id}`)
    if (i > 0) {
      batch.set(penaltyBodyDoc, { num: i - 1, type: penalty.type, species: penalty.species })
    } else {
      batch.set(penaltyTopDoc, {
        id: penalty.id,
        type: penalty.type,
        species: penalty.species,
      })
    }
  })

  // [penalty] penaltyTopにBodyNumを書き込む
  batch.update(penaltyTopDoc, { bodyNum: penaltyLength })

  await batch.commit()
}
