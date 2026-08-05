const express = require("express");
const router = express.Router();

const { 
    createBooking,    
    getMyBookings,
    cancelBooking,
    getAllBookings,
    getBookingById,
    getBookingStats,
} = require("../controllers/bookingController");

const { protect, admin } = require("../middleware/authMiddleware");

router.get("/stats", protect, admin, getBookingStats);

router.get("/", protect, admin, getAllBookings);

router.get("/my-bookings", protect, getMyBookings);

router.get("/:id", protect, getBookingById);

router.post("/", protect, createBooking);

router.put("/:id/cancel", protect, cancelBooking);

module.exports = router;