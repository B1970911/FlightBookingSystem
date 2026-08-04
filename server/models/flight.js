const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
    {
        flightNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        airline: {
            type: String,
            required: true,
            trim: true,
        },

        departureCity: {
            type: String,
            required: true,
            trim: true,
        },

        arrivalCity: {
            type: String,
            required: true,
            trim: true,
        },

        departureTime: {
            type: Date,
            required: true,
        },

        arrivalTime: {
            type: Date,
            required: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        totalSeats: {
            type: Number,
            required: true,
            min: 1,
        },

        availableSeats: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["Scheduled", "Delayed", "Cancelled"],
            default: "Scheduled",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Flight", flightSchema);