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

app.get("/", (req, res) => {
    res.send("Flight Booking API is Running...");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});