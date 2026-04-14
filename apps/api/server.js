const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require("express")
const cors = require("cors")
const { runMission, getVersionsHierarchy } = require("../../core/orchestrator")
const { allocate } = require("../../domains/fund/engine")
const { record } = require("../../domains/revenue/engine")

const app = express()
app.use(cors())
app.use(express.json())

app.post("/run", async (req,res)=>{
  try {
    const mission = await runMission("proj", req.body.objective)
    const capital = allocate(100)
    const rev = record(200)
    res.json({ mission, capital, revenue: rev })
  } catch (err) {
    console.error('[API] /run failure:', err);
    res.status(500).json({ error: "Mission execution failed", details: err.message });
  }
})

app.post("/dashboard/init", async (req, res) => {
  try {
    // Trigger a mission specifically to bootstrap the dashboard structure
    const result = await runMission(".", "create new Dashboard");
    res.json({ status: "Dashboard infrastructure scaffolded", result });
  } catch (err) {
    console.error('[API] /dashboard/init failure:', err);
    res.status(500).json({ error: "Dashboard scaffolding failed", details: err.message });
  }
});

app.get("/hierarchy", async (req, res) => {
  try {
    const hierarchy = await getVersionsHierarchy();
    res.json(hierarchy);
  } catch (err) {
    console.error('[API] /hierarchy failure:', err);
    res.status(500).json({ error: "Hierarchy retrieval failed", details: err.message });
  }
});

app.listen(3001, ()=>console.log("v28.2 running"))
