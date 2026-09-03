const mongoose = require("mongoose");

const bookedSeatDetailSchema = new mongoose.Schema(
    {
        seatNumber: {
            type: String,
            required: true,
            trim: true,
        },
        seatClass: {
            type: String,
            enum: ["Economy", "Business"],
        },
        position: {
            type: String,
            enum: ["Window", "Middle", "Aisle"],
        },
        price: {
            type: Number,
            min: 0,
        },
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema(
    {
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

        selectedSeats: {
            type: [String],
            default: [],
        },

        seatDetails: {
            type: [bookedSeatDetailSchema],
            default: [],
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
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Booking", bookingSchema);