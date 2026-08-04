const express = require("express");

const router = express.Router();

const {
    createFlight,
    getFlights,
    getFlightById,
    updateFlight,
    deleteFlight,
} = require("../controllers/flightController");

const { protect, admin } = require("../middleware/authMiddleware");

router.post("/", protect, admin, createFlight);

router.get("/", getFlights);

router.get("/:id", getFlightById);

router.put("/:id", protect, admin, updateFlight);

router.delete("/:id", protect, admin, deleteFlight);

module.exports = router;