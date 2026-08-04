const express = require("express");

const router = express.Router();

const {
    createFlight,
    getFlights,
    getFlightById,
    updateFlight,
    deleteFlight,
} = require("../controllers/flightController");

router.post("/", createFlight);

router.get("/", getFlights);

router.get("/:id", getFlightById);

router.put("/:id", updateFlight);

router.delete("/:id", deleteFlight);

module.exports = router;