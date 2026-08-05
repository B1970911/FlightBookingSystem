const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    flight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Flight",
        required: true,
    },

    numberOfSeats: {
        type: Number,
        required: true,
        min: 1,
    },

    totalPrice: {
        type: Number,
        required: true,
    },

    bookingStatus: {
        type: String,
        enum: ["Confirmed", "Cancelled"],  //enum prevents from using invalid values
        default: "Confirmed",
    },

}, {
    timestamps: true,
});

module.exports = mongoose.model("Booking", bookingSchema);