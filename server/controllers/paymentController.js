const mongoose = require("mongoose");
const Payment = require("../models/payment");
const Booking = require("../models/booking");
const sendEmail = require("../utils/emailService");

const createPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({
                message: "Valid booking ID is required",
            });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        // checking ownership
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Not authorized to pay for this booking",
            });
        }

        if (booking.bookingStatus === "Cancelled") {
            return res.status(400).json({
                message: "Cannot create payment for a cancelled booking",
            });
        }

        const existingPayment = await Payment.findOne({
            booking: bookingId,
        });

        // checks existing payment
        if (existingPayment) {
            return res.status(400).json({
                message: "Payment already exists for this booking",
            });
        }

        const payment = await Payment.create({
            user: req.user._id,
            booking: bookingId,
            amount: booking.totalPrice,
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid payment ID",
            });
        }

        const payment = await Payment.findById(id)
            .populate("user", "name email")
            .populate("booking");

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found",
            });
        }

        if (payment.paymentStatus === "Paid") {
            return res.status(400).json({
                message: "Payment is already confirmed",
            });
        }

        // checking ownership
        if (payment.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Not authorized to confirm this payment",
            });
        }

        payment.paymentStatus = "Paid";
        payment.paymentDate = new Date();

        await payment.save();

        // Send confirmation email
        let emailSent = false;
        try {
            await sendEmail(
                payment.user.email,
                "Payment Confirmation - SkyLink Ethiopia",
                `
                    <html>
                        <body>
                            <h2>SkyLink Ethiopia - Payment Confirmation</h2>

                            <p>Hello ${payment.user.name},</p>

                            <p>Your payment has been successfully confirmed.</p>

                            <p>Payment amount: ETB ${payment.amount.toFixed(2)}</p>

                            <p>Payment status: ${payment.paymentStatus}</p>

                            <p>Payment date: ${payment.paymentDate.toLocaleString()}</p>

                            <p>Thank you for choosing SkyLink Ethiopia.</p>

                            <p>We appreciate your booking and wish you a pleasant journey.</p>
                        </body>
                    </html>
                `
            );
            emailSent = true;
        } catch (emailError) {
            console.error("⚠️ Email delivery notice:", emailError.message);
        }

        res.status(200).json({
            message: emailSent
                ? "Payment confirmed successfully. Confirmation email sent."
                : "Payment confirmed successfully.",
            payment,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createPayment,
    confirmPayment,
};