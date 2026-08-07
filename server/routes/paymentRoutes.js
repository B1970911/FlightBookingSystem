const express = require("express");
const router = express.Router();

const {
    createPayment,
    confirmPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createPayment);

router.put("/:id/confirm", protect, confirmPayment);

module.exports = router;