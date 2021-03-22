const { reference } = require('./reference.js') //山札
var _ = require('lodash')

//カード配布関数
exports.cardDistribution = async (playersNum, roomId, fireStore) => {
  //------------------------- 準備↓ ----------------------------//
  var batch = fireStore.batch()
  let handLength = 0 //各プレーヤーの手札枚数
  let penaltyLength // ≒7
  // let penaltyBodyNum = 0 //確認用
  let stack = reference //山札
  const PENALTY = 7
  const penalties = [] //ペナルティ
  const hands = []
  const penaltyTopDoc = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
  const penaltyBodyCol = fireStore.collection(`/rooms/${roomId}/penaltyBody`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  //------------------------- 準備↑ ----------------------------//

  //stackをシャッフル
  stack = _.shuffle(stack)

  //penaltyの枚数を決定 通常7枚
  penaltyLength = PENALTY + ((stack.length - PENALTY) % playersNum)

  // [penalty] 作成 stackから 7+(全数%プレイヤー数)枚入れ込む
  for (let i = penaltyLength - 1; i >= 0; i--) {
    while (stack[i].type === 'yes' || stack[i].type === 'no') {
      stack = _.shuffle(stack)
    }
    penalties.push(...stack.splice(i, 1))
  }

  // [penalty] Save 枚数が合うまで回す
  // 経緯 batch処理✗ -> for文✗ -> firestore直接確認して枚数あってなければもう一度やる方式にする
  //TODOwhileいらない形に..検討
  // while (penaltyBodyNum < penaltyLength - 1) {
    // penaltyBodyNum = 0

    //まずpenaltyBodyコレクションを初期化
    await penaltyBodyCol.get().then(col => {
      col.forEach(doc => {
        doc.ref.delete()
      })
    })

    //Save
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

    await batch.commit()

    // 確認
    // await penaltyBodyCol.get().then(col => {
    //   penaltyBodyNum = col.size
    // })
  // }

  //penaltyTopにBodyNumを入れ込む
  // penaltyTopDoc.update({ bodyNum: penaltyBodyNum })
  penaltyTopDoc.update({ bodyNum: penaltyLength })

  // [hand] 作成 残り (stack-penalty) のstackからstack/sum枚ずつ入れ込む
  handLength = stack.length / playersNum
  for (let i = 0; i < playersNum; i++) {
    //一人ずつ入れ込む
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

  //[hand] Save 枚数が合うまで回す
  await players.get().then(col => {
    //colはobjectなのでforEachでindexを取得できない → col.docsは配列なのでindex取得可◎
    col.docs.forEach(async (doc, i) => {
      let handNum = 0 //確認用、ローカル変数である必要あり
      while (handNum < handLength) {
        var batch = fireStore.batch() //ローカル変数である必要あり
        handNum = 0
        // [hand] Save
        const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${doc.id}/hand`)
        //まずhandコレクションを初期化
        await handCol.get().then(col => {
          col.forEach(doc => {
            doc.ref.delete()
          })
        })
        //Save
        hands[i].forEach(card => {
          const cardRef = fireStore.doc(`/rooms/${roomId}/invPlayers/${doc.id}/hand/${card.id}`)
          batch.set(cardRef, { type: card.type, species: card.species })
        })

        await batch.commit()

        // 確認
        await handCol.get().then(col => {
          handNum = col.size
        })
      }
      // 各プレーヤーにhandNumをセットする
      const playerRef = fireStore.doc(`/rooms/${roomId}/players/${doc.id}`)
      playerRef.update({ handNum: handNum })
    })
  })
}
