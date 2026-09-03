const express = require("express");

const router = express.Router();

const {
    createFlight,
    getFlights,
    getFlightById,
    getFlightSeats,
    configureFlightSeats,
    generateFlightSeats,
    updateFlight,
    deleteFlight,
    cancelFlight,
} = require("../controllers/flightController");

const { protect, admin } = require("../middleware/authMiddleware");

router.post("/", protect, admin, createFlight);

router.get("/", getFlights);

router.get("/:id/seats", getFlightSeats);
router.post("/:id/seats", protect, admin, configureFlightSeats);
router.put("/:id/seats", protect, admin, configureFlightSeats);
router.post("/:id/generate-seats", protect, admin, generateFlightSeats);

router.put("/:id/cancel", protect, admin, cancelFlight);

router.get("/:id", getFlightById);

router.put("/:id", protect, admin, updateFlight);

router.delete("/:id", protect, admin, deleteFlight);

module.exports = router;