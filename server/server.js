const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

const userRoutes = require("./routes/userRoutes");
const flightRoutes = require("./routes/flightRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

connectDB();

const app = express();

app.use(cors());       //it allows the frontend to communicate with the backend regardless of where the frontend is hosted
app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/flights", flightRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 5000;

const sendEmail = require("./utils/emailService");

app.get("/api/test-email", async (req, res) => {
    try {
        const to = req.query.to || process.env.EMAIL_USER;
        const result = await sendEmail({
            to,
            subject: "SkyLink Ethiopia - Email Service Test",
            text: "This is a test notification from SkyLink Ethiopia flight booking system. Your Gmail SMTP email service is working properly!",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #1e3a8a;">SkyLink Ethiopia Email Test</h2>
                    <p style="color: #16a34a; font-weight: bold;">✅ SMTP Connection &amp; Email Dispatch Succeeded!</p>
                    <p>Your Gmail SMTP email configuration is active and working properly.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                    <p style="color: #64748b; font-size: 13px;">Recipient: ${to}</p>
                </div>
            `
        });
        res.status(200).json({
            success: true,
            message: `Test email sent successfully to ${to}.`,
            result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            code: error.code,
        });
    }
});

app.get("/", (req, res) => {
    res.send("Flight Booking API is Running...");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});