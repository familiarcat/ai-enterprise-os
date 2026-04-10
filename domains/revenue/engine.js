
let revenue = 0

function record(amount){
  revenue += amount
  return revenue
}

module.exports = { record }
