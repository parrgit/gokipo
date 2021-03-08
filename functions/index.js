const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

var fireStore = admin.firestore()
var _ = require('lodash')
require('array-foreach-async') //npm i array-foreach-async

// サーバー側でリッスンの例【現時点では使わない】
// functionsの仕組みによりフィールドの検知はできず、ドキュメントの検知となる
// おそらくPCでのemulate（serve）では動かせない
// -------------------------------------------------//
// →「firebase deploy --only functions」でfunctionsをデプロイ◆◆◆◆若干長いけど忘れずやる◆◆◆◆
// クライアント側は普通に「npm run dev」
// サーバー側のコンソールはFirebase -> Functions -> ログ -> ▶
// exports.gameStart = functions.firestore
//   .document('/rooms/{roomId}/players/{userId}')
//   .onWrite((change, context) => {
//     console.log('GAME START!')
//     console.log(context.params.roomId) //{roomId}
//     console.log(context.params.userId) //{userId}
//     console.log(change.after.data()) //変更されたドキュメントの内容を表示
//   })

//TODO1枚ずつ読んでしまうのでlazyに呼び出したいが..もしくはhttpsCallable関数に入れ込み負担を軽くする
//TODO初期だけやらなければ使えるっちゃ使える
// exports.calculateHandNums = functions.firestore
//   .document('/rooms/{roomId}/invPlayers/{uid}/hand/{docId}')
//   .onWrite(async (change, context) => {
//     console.log('CALCULATE!')
//     const roomId = context.params.roomId
//     const uid = context.params.uid
//     const changedHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
//     const changedPlayer = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
//     let handNum = 0
//     await changedHandCol.get().then(col => {
//       col.forEach(() => {
//         handNum++
//       })
//     })
//     changedPlayer.update({ handNum: handNum })
//   })

exports.gameStart = functions.https.onCall(async roomId => {
  console.log('----------GAME START!----------')
  const room = fireStore.doc(`rooms/${roomId}`)
  const progress = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  let allReady = true
  let canContinue = true
  await progress.get().then(doc => {
    const flag = doc.data().phase === 'waiting'
    canContinue = canContinue && flag
  })
  if (!canContinue) {
    console.log('THE GAME HAS ALREADY START')
    return
  }
  let sum = 0 //プレイヤー数
  await players.get().then(coll => {
    coll.forEach(() => {
      sum++
    })
  })
  await room.get().then(doc => {
    const minNumber = doc.data().minNumber
    const maxNumber = doc.data().maxNumber
    const flag = sum >= minNumber && sum <= maxNumber
    canContinue = canContinue && flag
  })
  if (!canContinue) {
    console.log('人数制限を満たしていません')
    return
  }
  await players.get().then(coll => {
    coll.forEach(doc => {
      allReady = allReady && doc.data().isReady
    })
  })
  if (!allReady) return
  gameStart_cardDistribution(sum, roomId)
  gameStart_determineGiver(roomId, players)
  phaseSet(roomId, 'give')
})

async function gameStart_cardDistribution(sum, roomId) {
  let stack = [] //山札
  let handLength = 0 //各プレーヤーの手札枚数
  let penaltySum = 0 //確認用
  const penalties = [] //ペナルティ
  const hands = []
  const reference = fireStore.collection('/reference')
  const penaltyTopDoc = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
  const penaltyBodyCol = fireStore.collection(`/rooms/${roomId}/penaltyBody`)
  const players = fireStore.collection(`rooms/${roomId}/players`)
  //stackにreferenceを入れ込む
  await reference.get().then(col => {
    col.docs.forEach(doc => {
      stack.push({
        id: doc.id,
        type: doc.data().type,
        species: doc.data().species,
      })
    })
  })
  //stackをシャッフル
  stack = _.shuffle(stack)
  // [penalty] 作成 stackから 7+(全数%プレイヤー数)枚入れ込む
  for (let i = 6 + ((stack.length - 7) % sum); i >= 0; i--) {
    //TODO7をPENALTY（定数）などにする
    while (stack[i].type === 'yes' || stack[i].type === 'no') {
      stack = _.shuffle(stack)
    }
    penalties.push(...stack.splice(i, 1))
  }
  // [penalty] Save 枚数が合うまで回す
  // 経緯 batch処理✗ -> for文✗ -> firestore直接確認して枚数あってなければもう一度やる方式にする
  while (penaltySum < 6) {
    penaltySum = 0
    await penaltySave(roomId, penalties, penaltyBodyCol, penaltyTopDoc) //Save
    // 確認
    await penaltyBodyCol.get().then(col => {
      col.forEach(() => {
        penaltySum++
      })
    })
  }
  // [hand] 作成 残りのstackからstack/sum枚ずつ入れ込む
  handLength = stack.length / sum
  for (let i = 0; i < sum; i++) {
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
  //Save 枚数が合うまで回す
  players.get().then(col => {
    //colはobjectなのでforEachでindexを取得できない → col.docsは配列なのでindex取得可◎
    col.docs.forEach(async (doc, i) => {
      let handSum = 0 //確認用、ローカル変数である必要あり
      while (handSum < handLength) {
        handSum = 0
        await handsSave(roomId, doc.id, hands[i]) // [hand] Save
        // 確認
        const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${doc.id}/hand`)
        await handCol.get().then(col => {
          col.forEach(() => {
            handSum++
          })
        })
      }
      //自動化してあるがhttpsCallable↓に変更しても良い
      // 各プレーヤーにhandNumをセットする
      const playerRef = fireStore.doc(`/rooms/${roomId}/players/${doc.id}`)
      await playerRef.update({ handNum: handSum })
    })
  })
}

async function penaltySave(roomId, penalties, penaltyBodyCol, penaltyTopDoc) {
  var batch = fireStore.batch()
  //まずpenaltyコレクションを初期化
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
}

async function handsSave(roomId, uid, hand) {
  var batch = fireStore.batch()
  const handCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
  //まずhandコレクションを初期化
  await handCol.get().then(col => {
    col.forEach(doc => {
      doc.ref.delete()
    })
  })
  //Save
  hand.forEach(card => {
    const cardRef = fireStore.doc(`/rooms/${roomId}/invPlayers/${uid}/hand/${card.id}`)
    batch.set(cardRef, { type: card.type, species: card.species })
  })
  await batch.commit()
}

async function gameStart_determineGiver(roomId, players) {
  const playerIDs = []
  await players.get().then(col => {
    col.docs.forEach(doc => {
      playerIDs.push(doc.id)
    })
  })
  const random = Math.floor(playerIDs.length * Math.random())
  const firstPlayerID = playerIDs.splice(random, 1)
  const firstPlayerDoc = fireStore.doc(`/rooms/${roomId}/players/${firstPlayerID}`)
  firstPlayerDoc.update({ isGiver: true, canbeNominated: false })
}

function phaseSet(roomId, phase) {
  progress = fireStore.doc(`/rooms/${roomId}/progress/progDoc`)
  progress.update({
    phase: phase,
  })
}

exports.give = functions.https.onCall(async (submission, context) => {
  console.log('==============give================')
  let giversCardSum = 0
  let canContinue = true
  let acceptor = {
    id: submission.acceptorId,
  }
  let giver = {
    id: context.auth.uid,
  }
  const roomId = submission.roomId
  const real = submission.real
  const declare = submission.declare
  const commons = ['bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk']
  // firestoreRefs
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const giverHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${giver.id}/hand`)
  const giverDoc = fireStore.doc(`rooms/${roomId}/players/${giver.id}`)
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${acceptor.id}`)
  const realInGiverHandDoc = fireStore.doc(
    `/rooms/${roomId}/invPlayers/${giver.id}/hand/${real.id}`
  )
  const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)

  //---バリデーション---//
  //phaseがgiveか、関数発火者のisGiverがtrueか
  await progressDoc.get().then(doc => {
    const flag = doc.data().phase === 'give'
    canContinue = canContinue && flag
  })
  await giverDoc.get().then(doc => {
    const flag = doc.data().isGiver === true
    canContinue = canContinue && flag
  })
  if (!canContinue) return
  //手札存在するか
  await giverHandCol.get().then(col => {
    col.docs.forEach(() => {
      giversCardSum++
    })
  })
  if (giversCardSum < 1) {
    stop()
    return
  }
  //選択したカードが存在するか
  await realInGiverHandDoc.get().then(doc => {
    canContinue = canContinue && doc.data()
  })
  if (!canContinue) {
    //TODOalertを出す「エラー！カードがありません」
    console.log('DONT HAVE THE CARD')
    return
  }
  //選択されたplayerは受け手になれるか
  await acceptorDoc.get().then(doc => {
    canContinue = canContinue && doc.data().canbeNominated
  })
  if (!canContinue) {
    //TODOalertを出す「すでに出し手になっているため、指名できません」
    console.log('CANT BE ACCEPTOR')
    return
  }
  //チート宣言していないか
  canContinue = canContinue && (declare === 'king' || commons.includes(declare))
  if (!canContinue) {
    //TODOalertを出す「エラー！もう一度提出してください」
    console.log('CHEET!')
    return
  }
  setAuthenticity(declare, real, authenticityDoc)
  await realDoc.set({
    id: real.id,
    type: real.type,
    species: real.species,
  })
  await realInGiverHandDoc.delete()
  await acceptorDoc.update({
    isAcceptor: true,
    canbeNominated: false,
  })
  await progressDoc.update({
    declare: declare,
    phase: 'accept',
  })
})

function setAuthenticity(declare, real, authenticityDoc) {
  let authenticity = null
  if (real.type === 'yes') {
    if (declare === 'king') {
      authenticity = false
    } else {
      authenticity = true
    }
  } else if (real.type === 'no') {
    authenticity = false
  } else if (declare === 'king') {
    authenticity = real.type === 'king'
  } else {
    authenticity = real.species === declare
  }
  authenticityDoc.set({ authenticity: authenticity })
}

function stop() {
  console.log('STOP!')
  return
}

exports.pass = functions.https.onCall(async (roomId, context) => {
  console.log('-------------PASS-------------')
  let canContinue = true
  let canPass = false
  const uid = context.auth.uid
  //firestore
  const roomDoc = fireStore.doc(`rooms/${roomId}`)
  const playersCol = fireStore.collection(`rooms/${roomId}/players`)
  const acceptorDoc = fireStore.doc(`rooms/${roomId}/players/${uid}`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)

  //acceptフェーズであることの確認
  roomDoc.get().then(doc => {
    canContinue = canContinue && doc.data().phase === 'accept'
  })
  if (!canContinue) return
  //一人以上指名可であるかの確認
  await playersCol.get().then(col => {
    col.forEach(doc => {
      canPass = canPass || doc.data().canbeNominated
    })
  })
  if (!canPass) return
  //受け手を出し手に、出し手のisGiverをfalseにする
  acceptorDoc.update({ isGiver: true, isAcceptor: false })
  await playersCol
    .where('isGiver', '==', true) //出し手をクエリ
    .get()
    .then(col => {
      col.forEach(doc => {
        doc.ref.update({ isGiver: false })
      })
    })
  progressDoc.update({ phase: 'give' })
})

//=====ANSWER=====//
exports.answer = functions.https.onCall(async (dataSet, context) => {
  //------------------------- 準備↓ ----------------------------//
  const roomId = dataSet.roomId //ルームID
  const ans = dataSet.ans //受け手の答え（本当/嘘）
  const acceptorId = context.auth.uid //受け手のid（answer発火者）
  let giverId = '' //出し手id
  let declare = '' //宣言
  let real = {} //実物
  let authenticity = null //真偽
  //firestore
  const authenticityDoc = fireStore.doc(`rooms/${roomId}/authenticity/authenDoc`)
  const realDoc = fireStore.doc(`rooms/${roomId}/real/realDoc`)
  const progressDoc = fireStore.doc(`rooms/${roomId}/progress/progDoc`)
  const playersCol = fireStore.collection(`rooms/${roomId}/players`)

  await realDoc.get().then(doc => {
    real.id = doc.data().id
    real.type = doc.data().type
    real.species = doc.data().species
  })
  await authenticityDoc.get().then(doc => {
    authenticity = doc.data().authenticity
  })
  await progressDoc.get().then(doc => {
    declare = doc.data().declare
  })
  await playersCol
    .where('isGiver', '==', true) //出し手をクエリ
    .get()
    .then(snapshot => {
      //TODO snapshot[0].id みたいな感じに書けない？→かけない class snapshot classの知識が必要
      giverId = snapshot.docs[0].id
      // snapshot.forEach(doc => {
      //   giverId = doc.id
      // })
    })
  //------------------------- 準備↑ ----------------------------//

  //TODOphase===accept?
  //TODO受け手.isAcceptor===true?
  //出し手/受け手 どちらが勝ちか
  if (ans === authenticity) {
    //出し手負け
    answerSubFunc(roomId, real, declare, progressDoc, playersCol, giverId, 'giver', null)
  } else {
    //受け手負け
    answerSubFunc(roomId, real, declare, progressDoc, playersCol, acceptorId, 'acceptor', giverId)
  }
})

async function answerSubFunc(
  roomId,
  real,
  declare,
  progressDoc,
  playersCol,
  loserId,
  loser,
  giverId
) {
  console.log('===========ANSWER SUB FUNC==============')
  //------------------------- 準備↓ ----------------------------//
  let sum = 0
  let oneHandType = ''
  let oneHandSpecies = ''
  let loserBurdenDoc = fireStore.doc(`rooms/${roomId}/players/${loserId}/burden/${real.id}`)
  const loserDoc = fireStore.doc(`rooms/${roomId}/players/${loserId}`)
  const loserHandCol = fireStore.collection(`rooms/${roomId}/invPlayers/${loserId}/hand`)
  const loserBurdenCol = fireStore.collection(`rooms/${roomId}/players/${loserId}/burden`)
  const giverDoc = fireStore.doc(`rooms/${roomId}/players/${giverId}`) //受け手を出し手に変更する際に使用

  //oneHandType: 手札が1枚のときに使うtype (関数の中に入れ込んでも良い、可読性or動作性)
  await loserHandCol.get().then(col => {
    col.forEach(doc => {
      oneHandType = doc.data().type
    })
  })
  //oneHandSpecies: 手札が1枚のときに使うspecies (関数の中に入れ込んでも良い、可読性or動作性)
  await loserHandCol.get().then(col => {
    col.forEach(doc => {
      oneHandSpecies = doc.data().species
    })
  })
  //------------------------- 準備↑ ----------------------------//
  if (real.type === 'yes' || real.type === 'no') {
    //手札測定
    await loserHandCol.get().then(col => {
      col.forEach(() => {
        sum++
      })
    })
    //手札0枚
    if (sum < 1) {
      stop() //TODOこの辺でstop()が2回呼ばれる現象が発生
      return
    } else if (sum === 1) {
      //手札1枚
      //king
      if (declare === 'king') {
        if (oneHandType === 'king') {
          setYesNo(loserDoc, progressDoc)
        } else {
          stop()
          return
        }
        //common
      } else {
        if (oneHandSpecies === declare) {
          setYesNo(loserDoc, progressDoc)
        } else {
          stop()
          return
        }
      }
    } else if (sum > 1) {
      //手札2枚以上
      setYesNo(loserDoc, progressDoc)
    }
  } else {
    //YES NO以外
    await loserBurdenDoc.set({ type: real.type, species: real.species })
    while (real.type === 'king') {
      //KINGをセット
      real = await penaltyProcess(real, roomId)
      loserBurdenDoc = fireStore.doc(`rooms/${roomId}/players/${loserId}/burden/${real.id}`)
      await loserBurdenDoc.set({ type: real.type, species: real.species })
    }
    //負け手のburdenを解析し、負け条件を満たしていないか判定
    await judge(loserBurdenCol)
    //受け手が負けの場合、受け手を出し手に変更
    if (loser === 'acceptor') {
      await loserDoc.update({ isGiver: true })
      await giverDoc.update({ isGiver: false })
    }
    //players情報の更新
    await playersCol.get().then(col => {
      col.forEach(doc => {
        doc.ref.update({
          canbeNominated: true,
          isAcceptor: false,
        })
      })
    })
    //以下awaitでなくてもOK
    //負け手のcanbeNominatedをfalseに
    loserDoc.update({ canbeNominated: false })
    //phaseをgiveにする
    progressDoc.get().then(doc => {
      doc.ref.update({
        phase: 'give',
        turn: doc.data().turn + 1,
      })
    })
  }
}

async function penaltyProcess(burden, roomId) {
  console.log('===========PENALTY PROCESS==========')
  const penaltyTopDoc = fireStore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
  const penaltyBodyCol = fireStore.collection(`/rooms/${roomId}/penaltyBody`)
  const penaltyBodyTop = {} //penaltyBodyColのトップ(num===0)
  //実物をペナルティの一番上にする
  await penaltyTopDoc.get().then(doc => {
    burden.id = doc.data().id
    burden.type = doc.data().type
    burden.species = doc.data().species
  })
  //penaltyTopをpenaltyBodyの一番上にする→penaltyBodyの一番上を削除する
  await penaltyBodyCol
    .where('num', '==', 0)
    .get()
    .then(snapshot => {
      //TODO書き方変えるsnapshot.docs[0].id, snapshot.docs[0].data().typeみたいな
      snapshot.forEach(doc => {
        penaltyBodyTop.id = doc.id
        penaltyBodyTop.type = doc.data().type
        penaltyBodyTop.species = doc.data().species
        doc.ref.delete()
      })
    })
  await penaltyTopDoc.set(penaltyBodyTop)
  //penaltyBodyのnumを調整(-1)
  await penaltyBodyCol.get().then(col => {
    col.forEach(doc => {
      doc.ref.update({
        num: doc.data().num - 1,
      })
    })
  })
  return burden
}

async function judge(loserBurdenCol) {
  const burdens = ['bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk']
  let singleTotals = {}
  let speciesTotal = 0
  burdens.forEach(burden => {
    singleTotals[burden] = 0
  })
  await loserBurdenCol.get().then(col => {
    col.forEach(doc => {
      switch (doc.data().species) {
        case 'bat':
          singleTotals.bat++
          break
        case 'crh':
          singleTotals.crh++
          break
        case 'fly':
          singleTotals.fly++
          break
        case 'frg':
          singleTotals.frg++
          break
        case 'rat':
          singleTotals.rat++
          break
        case 'spn':
          singleTotals.spn++
          break
        case 'stk':
          singleTotals.stk++
          break
      }
    })
  })
  Object.values(singleTotals).forEach(arg => {
    if (arg > 3) {
      stop()
      return //TODO元関数を終わらせるためのなにかを返す
    } else if (arg > 0) {
      speciesTotal++
    }
  })
  if (speciesTotal > 6) {
    stop()
    return
  }
}

function setYesNo(loserDoc, progressDoc) {
  loserDoc.update({ isYesNoer: true })
  progressDoc.update({ phase: 'yesno' })
}

exports.accumulate = functions.https.onCall((submission, context) => {
  console.log('============================ACCUMULATE!================================')
  const roomId = submission.roomId
  const burdens = submission.burdens //提出カード1or2枚
  const declare = submission.declare
  const phase = submission.phase
  const uid = context.auth.uid
  let includeYesNo = false //提出カードにyes/noが含まれていないか

  if (phase !== 'yesno') {
    console.log('yesnoフェーズではありません')
    // return //TODOつける
  }
  if (burdens.length < 1 || burdens.length > 2) {
    console.log('1,2枚溜められます')
    return
  }
  burdens.forEach(burden => {
    const flag = burden.type === 'yes' || burden.type === 'no'
    includeYesNo = includeYesNo || flag
  })
  if (includeYesNo) {
    console.log('yes/noは選択できません')
    return
  }
  //1枚提出
  if (burdens.length < 2) {
    if (declare === 'king') {
      if (burdens[0].type === 'king') {
        accumulateSub(roomId, burdens, declare, uid)
        return
      } else {
        console.log('1枚のキングを溜めるか、キング以外で2枚溜めてください')
        return
      }
    } else {
      if (burdens[0].species === declare) {
        accumulateSub(roomId, burdens, declare, uid)
        return
      } else {
        console.log('宣言された物と同じ厄介者を溜めてください')
        return
      }
    }
  } else {
    //2枚提出
    if (declare === 'king') {
      if (burdens[0].type !== declare && burdens[1].type !== declare) {
        accumulateSub(roomId, burdens, declare, uid)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
      }
    } else {
      if (burdens[0].species !== declare && burdens[1].species !== declare) {
        accumulateSub(roomId, burdens, declare, uid)
        return
      } else {
        console.log('2枚溜める場合は、宣言と違う厄介者を溜めてください')
      }
    }
  }
})

async function accumulateSub(roomId, burdens, declare, uid) {
  console.log('=================ACCUMULATE SUB FUNC=====================')
  //------------------------- 準備↓ ----------------------------//
  let sum = 0
  let canContinue = true
  let isAcceptor = false
  //firestore
  const accumulatorDoc = fireStore.doc(`/rooms/${roomId}/players/${uid}`)
  const accumulatorHandCol = fireStore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
  const accumulatorBurdenCol = fireStore.collection(`/rooms/${roomId}/players/${uid}/burden`)
  //------------------------- 準備↑ ----------------------------//

  //手札測定
  await accumulatorHandCol.get().then(col => {
    col.forEach(() => {
      sum++
    })
  })
  //手札0枚
  if (sum < 1) {
    stop()
    return
  }
  //バリデーション 選択したburdensが手札に存在するか
  if (declare !== 'king') {
    const hand = []
    //手札配列hand[]作製
    await accumulatorHandCol.get().then(col => {
      col.docs.forEach(async doc => {
        const card = {
          id: doc.id,
          species: doc.data().species,
        }
        hand.push(card)
      })
    })
    burdens.some(burden => {
      //handにburdens(1or2枚)があるか
      //ループを抜けやすくするためにarray.someを使用(for文の方がいいとの情報もあり)
      let index = 0
      index = hand.findIndex(card => {
        return card.species === burden.species
      })
      if (index === -1) {
        stop()
        canContinue = false
        return true //burdens.someを抜ける
      }
      hand.splice(index, 1) //burdensが2枚でhandに1枚しかdeclareがない場合に必要
    })
    if (!canContinue) return
    //1枚ずつburden保存（最大2枚）
    await burdens.forEachAsync(async burden => {
      let accumulatorBurdenDoc = fireStore.doc(
        `/rooms/${roomId}/players/${uid}/burden/${burden.id}`
      )
      //player(uid)/burdenにセット
      await accumulatorBurdenDoc.set({ type: burden.type, species: burden.species })
      //kingである限りpenaltyTopからburdenに保存し続ける
      //TODOwhile内でエラーあり（原因特定できておらず
      while (burden.type === 'king') {
        //KINGをセット
        console.log(burden)
        burden = await penaltyProcess(burden, roomId)
        accumulatorBurdenDoc = fireStore.doc(`rooms/${roomId}/players/${uid}/burden/${burden.id}`)
        await accumulatorBurdenDoc.set({ type: burden.type, species: burden.species })
      }
    })
    judge(accumulatorBurdenCol)
    await accumulatorDoc.get().then(doc => {
      isAcceptor = doc.data().isAcceptor
    })

    //TODOいまココ
  } else {
    //common
  }
}

//カード内容表示
// let speciesTotalStack = {
//   bat: 0,
//   crh: 0,
//   fly: 0,
//   frg: 0,
//   rat: 0,
//   spn: 0,
//   stk: 0,
// }
// let speciesTotalPena = {
//   bat: 0,
//   crh: 0,
//   fly: 0,
//   frg: 0,
//   rat: 0,
//   spn: 0,
//   stk: 0,
// }
// console.log(`------------stack------------`)
// for (i = 0; i < stack.length; i++) {
//   console.log(`${i}:${stack[i].id} ${stack[i].type}_${stack[i].species}`)
// }
// console.log(`------------stack------------`)
// for (i = 0; i < stack.length; i++) {
//   switch (stack[i].species) {
//     case 'bat':
//       speciesTotalStack.bat++
//       break
//     case 'crh':
//       speciesTotalStack.crh++
//       break
//     case 'fly':
//       speciesTotalStack.fly++
//       break
//     case 'frg':
//       speciesTotalStack.frg++
//       break
//     case 'rat':
//       speciesTotalStack.rat++
//       break
//     case 'spn':
//       speciesTotalStack.spn++
//       break
//     case 'stk':
//       speciesTotalStack.stk++
//       break
//   }
// }
// console.log(speciesTotalStack)
// console.log(`------------cards------------`)
// for (i = 0; i < cards.length; i++) {
//   console.log(`${i}:${cards[i].id} ${cards[i].type}_${cards[i].species}`)
// }
// console.log(`------------penalty------------`)
// for (i = 0; i < penalty.length; i++) {
//   switch (penalty[i].species) {
//     case 'bat':
//       speciesTotalPena.bat++
//       break
//     case 'crh':
//       speciesTotalPena.crh++
//       break
//     case 'fly':
//       speciesTotalPena.fly++
//       break
//     case 'frg':
//       speciesTotalPena.frg++
//       break
//     case 'rat':
//       speciesTotalPena.rat++
//       break
//     case 'spn':
//       speciesTotalPena.spn++
//       break
//     case 'stk':
//       speciesTotalPena.stk++
//       break
//   }
// }
// console.log(speciesTotalPena)
// }
