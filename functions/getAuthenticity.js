//真偽を算出して保存する
exports.getAuthenticity = (declare, real) => {
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
  return authenticity
}
