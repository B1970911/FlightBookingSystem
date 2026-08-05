const express = require("express");
const router = express.Router();

const { 
    createBooking,    
    getMyBookings,
    cancelBooking,
} = require("../controllers/bookingController");

const { protect } = require("../middleware/authMiddleware");  //only the logged-in users should be able to book flights

router.get("/my-bookings", protect, getMyBookings);

router.post("/", protect, createBooking);

router.put("/:id/cancel", protect, cancelBooking);

module.exports = router;