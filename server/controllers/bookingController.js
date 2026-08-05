const Booking = require("../models/booking");
const Flight = require("../models/flight");

const createBooking = async (req, res) => {
    try {

        const { flightId, numberOfSeats } = req.body;

        const flight = await Flight.findById(flightId);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        if (flight.availableSeats < numberOfSeats) {
            return res.status(400).json({
                message: "Not enough available seats",
            });
        }

        const totalPrice = flight.price * numberOfSeats;

        const booking = await Booking.create({
            user: req.user._id,
            flight: flightId,
            numberOfSeats,
            totalPrice,
        });

        flight.availableSeats -= numberOfSeats;

        // saves the updated flight in the database
        await flight.save();

        res.status(201).json(booking);

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

const getMyBookings = async (req, res) => {
    try {

        const bookings = await Booking.find({
            user: req.user._id,
        })
            // mongoose will fetch the specified user and flight document
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber departureCity arrivalCity departureTime price"
            );

        res.status(200).json(bookings);

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

const cancelBooking = async (req, res) => {
    try {

        const { id } = req.params;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }
        //to not one user cancel another users bookings
        if (
            booking.user.toString() !== req.user._id.toString() &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "Not authorized to cancel this booking",
            });
        }

        // to prevent double cancellation
        if (booking.bookingStatus === "Cancelled") {
            return res.status(400).json({
                message: "Booking is already cancelled",
            });
        }

        const flight = await Flight.findById(booking.flight);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        // restores the number of seats after cancellation
        flight.availableSeats += booking.numberOfSeats;

        booking.bookingStatus = "Cancelled";

        await flight.save();
        await booking.save();

        res.status(200).json(booking);

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

// admin to see all the bookings
const getAllBookings = async (req, res) => {
    try {

        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber departureCity arrivalCity departureTime price"
            );

        res.status(200).json(bookings);

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

const getBookingById = async (req, res) => {
    try {

        const { id } = req.params;

        const booking = await Booking.findById(id)
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber departureCity arrivalCity departureTime arrivalTime price airline"
            );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        // to avoid a logged in user accessing someone else's booking info
        if (
            booking.user._id.toString() !== req.user._id.toString() &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "Not authorized to view this booking",
            });
        }

        res.status(200).json(booking);

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};
const getBookingStats = async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();

        const confirmedBookings = await Booking.countDocuments({
            bookingStatus: "Confirmed",
        });

        const cancelledBookings = await Booking.countDocuments({
            bookingStatus: "Cancelled",
        });

        const confirmedBookingsList = await Booking.find({
            bookingStatus: "Confirmed",
        });

        const totalRevenue = confirmedBookingsList.reduce(
            (sum, booking) => sum + booking.totalPrice,
            0
        );
        res.status(200).json({
            totalBookings,
            confirmedBookings,
            cancelledBookings,
            totalRevenue,
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

module.exports = {
    createBooking,
    getMyBookings,
    cancelBooking,
    getAllBookings,
    getBookingById,
    getBookingStats,
};