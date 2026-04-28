const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require("express")
const cors = require("cors")
const { getEventBus } = require("./index")
const { runMission, getVersionsHierarchy, getMissionStatus } = require("../../domains/mission/application/MissionService")
const { allocate } = require("../../domains/fund/engine")
const { record } = require("../../domains/revenue/engine")
const { initMissionSubscriber } = require("../../domains/mission/infrastructure/MissionSubscriber")

const eventBus = getEventBus()
const app = express()
app.use(cors())
app.use(express.json())

// Initialize domain subscribers to start listening for events on boot
initMissionSubscriber();

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

app.get("/telemetry", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onCreated = (data) => sendEvent('mission.created', data);
  const onCompleted = (data) => sendEvent('mission.completed', data);
  const onFailed = (data) => sendEvent('mission.failed', data);

  eventBus.on('mission.created', onCreated);
  eventBus.on('mission.completed', onCompleted);
  eventBus.on('mission.failed', onFailed);

  req.on('close', () => {
    eventBus.removeListener('mission.created', onCreated);
    eventBus.removeListener('mission.completed', onCompleted);
    eventBus.removeListener('mission.failed', onFailed);
  });
});

app.get("/mission/:id", async (req, res) => {
  try {
    const status = await getMissionStatus(req.params.id);
    if (!status) return res.status(404).json({ error: "Mission not found" });
    res.json(status);
  } catch (err) {
    console.error('[API] /mission/:id failure:', err);
    res.status(500).json({ error: "Retrieval failed", details: err.message });
  }
});

app.listen(3001, ()=>console.log("v28.2 running"))
