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

        // Format payment date to match e.g. "8/20/2026, 12:57:24 PM"
        const formattedDate = payment.paymentDate.toLocaleString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });

        const subject = "SkyLink Ethiopia - Payment Confirmation";

        const textBody = `Hello ${payment.user.name},
Your payment has been successfully confirmed.
Payment amount: ETB ${payment.amount.toFixed(2)}
Payment status: ${payment.paymentStatus}
Payment date: ${formattedDate}
Thank you for choosing SkyLink Ethiopia.
We appreciate your booking and wish you a pleasant journey.`;

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #1e3a8a; padding: 22px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: bold;">SkyLink Ethiopia</h1>
                    <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Payment Confirmation</p>
                </div>
                <div style="padding: 26px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                    <p style="margin-top: 0;">Hello <strong>${payment.user.name}</strong>,</p>
                    <p style="margin: 0 0 16px 0; color: #0f766e; font-weight: 600;">Your payment has been successfully confirmed.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 140px;">Payment amount:</td>
                                <td style="padding: 6px 0; font-weight: bold; color: #1e3a8a;">ETB ${payment.amount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Payment status:</td>
                                <td style="padding: 6px 0; font-weight: bold; color: #16a34a;">${payment.paymentStatus}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Payment date:</td>
                                <td style="padding: 6px 0; color: #334155;">${formattedDate}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="margin: 16px 0 6px 0;">Thank you for choosing SkyLink Ethiopia.</p>
                    <p style="margin: 0;">We appreciate your booking and wish you a pleasant journey.</p>
                </div>
                <div style="background-color: #f1f5f9; padding: 12px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                    SkyLink Ethiopia | Safe & Reliable Travels
                </div>
            </div>
        `;

        // Send confirmation email
        let emailSent = false;
        try {
            await sendEmail({
                to: payment.user.email,
                subject,
                text: textBody,
                html: htmlBody,
            });
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
