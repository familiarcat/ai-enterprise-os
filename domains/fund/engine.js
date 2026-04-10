
let fund = { capital: 10000 }

function allocate(amount){
  fund.capital -= amount
  return fund.capital
}

module.exports = { fund, allocate }
