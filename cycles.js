/* const express = require("express");
const router = express.Router();
const cycleController = require("../controllers/cycleController");
const Cycle = require("../models/Cycle");

// GET /api/cycles/predictions/:userId - Obtener predicciones
router.get("/predictions/:userId", cycleController.getPredictions);

// GET /api/cycles/:userId - Obtener ciclos de usuario
router.get("/:userId", cycleController.getUserCycles);

// POST /api/cycles - Crear nuevo ciclo
router.post("/", cycleController.createCycle);

// POST /api/cycles - Crear ciclos múltiples
router.post("/", async (req, res) => {
  try {
    const { userId, cycles } = req.body;

    if (!userId || !Array.isArray(cycles)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    const formattedCycles = cycles.map((cycle) => ({
      userId,
      startDate: new Date(cycle.startDate),
      duration: Number(cycle.duration),
    }));

    await Cycle.insertMany(formattedCycles);
    res.status(201).json({ message: "Cycles saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; */

// ✅ routes/cycles.js limpio y funcional

const express = require("express");
const router = express.Router();
//const Cycle = require("../models/Cycle");
const cycleController = require("../controllers/cycleController");

// GET /api/cycles/predictions/:userId
/* router.get("/predictions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 });

    console.log("UserId recibido:", userId);
    console.log(
      "Ciclos en DB:",
      cycles.length,
      cycles.map((c) => c.startDate)
    );

    if (cycles.length < 3) {
      return res.status(400).json({
        status: "insufficient_data",
        message: "Se necesitan al menos 3 ciclos registrados",
      });
    }

    // Aquí deberías tener lógica para predecir (o usar controller)
    res.json({ status: "ok", predictions: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); */

// GET /api/cycles/predictions/:userId
router.get("/predictions/:userId", cycleController.getPredictions);

// GET /api/cycles/:userId
router.get("/:userId", async (req, res) => {
  try {
    const cycles = await Cycle.find({ userId: req.params.userId }).sort({
      startDate: -1,
    });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST /api/cycles — Acepta 1 ciclo o varios
router.post("/", async (req, res) => {
  try {
    const { userId, cycles } = req.body;

    if (!userId || !cycles || !Array.isArray(cycles) || cycles.length === 0) {
      return res
        .status(400)
        .json({ error: "Se requiere userId y al menos un ciclo" });
    }

    const formattedCycles = cycles.map((cycle) => {
      if (!cycle.startDate || !cycle.duration) {
        throw new Error("Cada ciclo debe tener startDate y duration");
      }

      return {
        userId,
        startDate: new Date(cycle.startDate),
        duration: Number(cycle.duration),
        symptoms: cycle.symptoms || "",
      };
    });

    await Cycle.insertMany(formattedCycles);
    res.status(201).json({ message: "Cycles saved successfully" });
  } catch (error) {
    console.error("Error creando ciclos:", error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
