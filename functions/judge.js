//todo getをanswerSub, accumulateSubに移行して高速化する
const { stop } = require('./stop.js')

exports.judge = async (roomId, loserId, fireStore) => {
  //------------------------- 準備↓ ----------------------------//
  console.log('===================== JUDGE ====================')
  const burdens = ['bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk']
  let totals = {}
  let speciesSum = 0
  let canContinue = true

  //Totalsの初期化()
  burdens.forEach(burden => {
    totals[burden] = 0
  })

  //firestore
  const loserRef = fireStore.doc(`/rooms/${roomId}/players/${loserId}`)
  //------------------------- 準備↑ ----------------------------//

  await loserRef.get().then(doc => {
    const burden = doc.data().burden

    burden.forEach(card => {
      switch (card.species) {
        case 'bat':
          totals.bat++
          break
        case 'crh':
          totals.crh++
          break
        case 'fly':
          totals.fly++
          break
        case 'frg':
          totals.frg++
          break
        case 'rat':
          totals.rat++
          break
        case 'spn':
          totals.spn++
          break
        case 'stk':
          totals.stk++
          break
      }
    })
  })

  Object.values(totals).forEach(arg => {
    if (arg > 3) {
      stop(roomId, loserId, fireStore)
      canContinue = false
      return
    } else if (arg > 0) {
      speciesSum++
    }
  })
  if (!canContinue) return false
  if (speciesSum > 4) {
    stop(roomId, loserId, fireStore)
    return false
  }
  return true
}
