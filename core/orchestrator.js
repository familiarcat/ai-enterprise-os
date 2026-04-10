
async function runMission(project, objective){
  const plan = "Plan for " + objective
  const execution = "Executed: " + plan
  const validation = "Validated: " + execution
  const decision = "Approved: " + validation

  return { plan, execution, validation, decision }
}

module.exports = { runMission }
