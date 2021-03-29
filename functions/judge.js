const { stop } = require('./stop.js')

exports.judge = async (roomId, loserId, loserBurden, accumArray, fireStore, admin) => {
  //------------------------- 準備↓ ----------------------------//
  console.log('===================== JUDGE ====================')
  const burdens = ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp']
  let totals = {}
  let speciesSum = 0
  let canContinue = true

  //Totalsの初期化()
  burdens.forEach(burden => {
    totals[burden] = 0
  })
  //------------------------- 準備↑ ----------------------------//

  loserBurden.forEach(card => {
    switch (card.species) {
      case 'ber':
        totals.ber++
        break
      case 'gzd':
        totals.gzd++
        break
      case 'lvr':
        totals.lvr++
        break
      case 'mon':
        totals.mon++
        break
      case 'nbs':
        totals.nbs++
        break
      case 'sal':
        totals.sal++
        break
      case 'srp':
        totals.srp++
        break
    }
  })

  Object.values(totals).forEach(arg => {
    if (arg > 3) {
      stop(roomId, loserId, accumArray, fireStore, admin)
      canContinue = false
      return
    } else if (arg > 0) {
      speciesSum++
    }
  })
  if (!canContinue) return false
  if (speciesSum > 4) {
    stop(roomId, loserId, accumArray, fireStore, admin)
    return false
  }
  return true
}
