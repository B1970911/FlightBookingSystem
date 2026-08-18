const Payment = require("../models/payment");
const Booking = require("../models/booking");
const sendEmail = require("../utils/emailService");

const createPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }
        //checking ownership
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Not authorized to pay for this booking",
            });
        }
        const existingPayment = await Payment.findOne({
            booking: bookingId,
        });
        //checks existing payment
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
        //checking ownership
        if (payment.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Not authorized to confirm this payment",
            });
        }

        payment.paymentStatus = "Paid";
        payment.paymentDate = new Date();

        await payment.save();
        //confirmation email
        await sendEmail(
            payment.user.email,
            "Payment Confirmation",
            `
                <html>
                    <body>
                        <h2>Flight Booking Payment Confirmation</h2>

                            <p>Hello ${payment.user.name},</p>

                            <p>Your payment has been successfully confirmed.</p>

                            <p>Payment amount: $${payment.amount.toFixed(2)}</p>

                            <p>Payment status: ${payment.paymentStatus}</p>

                            <p>Payment date: ${payment.paymentDate.toLocaleString()}</p>

                            <p>Thank you for using our Flight Booking System.</p>

                            <p>This is an automated payment confirmation.</p>
                        </body>
                    </html>
                `
        );

        res.status(200).json({
            message: "Payment confirmed successfully. Confirmation email sent.",
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