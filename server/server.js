const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const flightRoutes = require("./routes/flightRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/flights", flightRoutes);

app.use("/api/bookings", bookingRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Flight Booking API is Running...");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});