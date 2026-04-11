require('dotenv').config();

const express = require("express")
const { runMission } = require("../../core/orchestrator")
const { allocate } = require("../../domains/fund/engine")
const { record } = require("../../domains/revenue/engine")

const app = express()
app.use(express.json())

app.post("/run", async (req,res)=>{
  const mission = await runMission("proj", req.body.objective)
  const capital = allocate(100)
  const rev = record(200)
  res.json({ mission, capital, revenue: rev })
})

app.listen(3001, ()=>console.log("v28.2 running"))
