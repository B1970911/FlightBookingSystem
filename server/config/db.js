const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: "flightBooking",
        });

        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.log("❌ MongoDB Connection Error:");
        console.log(error);
    }
};

module.exports = connectDB;