const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Flight = require("../models/flight");

const createBooking = async (req, res) => {
    try {
        const { flightId, flight: flightIdAlt, selectedSeats, numberOfSeats } = req.body;
        const targetFlightId = flightId || flightIdAlt;

        if (!targetFlightId || !mongoose.Types.ObjectId.isValid(targetFlightId)) {
            return res.status(400).json({
                message: "Valid flight ID is required",
            });
        }

        const flight = await Flight.findById(targetFlightId);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        if (flight.status === "Cancelled") {
            return res.status(400).json({
                message: "Cannot book a cancelled flight.",
            });
        }

        // Branch 1: User requested specific seats (New Seat Selection feature)
        if (selectedSeats !== undefined) {
            if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
                return res.status(400).json({
                    message: "selectedSeats must be a non-empty array of seat numbers",
                });
            }

            // Normalize and check valid strings
            const normalizedSeats = [];
            for (let i = 0; i < selectedSeats.length; i++) {
                const s = selectedSeats[i];
                if (typeof s !== "string" || !s.trim()) {
                    return res.status(400).json({
                        message: `Invalid seat number at index ${i}`,
                    });
                }
                normalizedSeats.push(s.trim().toUpperCase());
            }

            // Check for duplicate seat numbers in request
            if (new Set(normalizedSeats).size !== normalizedSeats.length) {
                return res.status(400).json({
                    message: "Duplicate seats selected in booking request",
                });
            }

            // Check if flight has seat map configured
            if (!flight.seats || flight.seats.length === 0) {
                return res.status(400).json({
                    message: "Flight does not have seat selection configured",
                });
            }

            // Map flight seats by uppercase seatNumber
            const flightSeatMap = new Map(
                flight.seats.map((seat) => [seat.seatNumber.toUpperCase(), seat])
            );

            // Validate that each requested seat exists and is currently available
            let calculatedTotalPrice = 0;
            const seatDetails = [];

            for (const seatNum of normalizedSeats) {
                const seatObj = flightSeatMap.get(seatNum);
                if (!seatObj) {
                    return res.status(404).json({
                        message: `Seat ${seatNum} does not exist on this flight`,
                    });
                }

                if (seatObj.status !== "Available") {
                    return res.status(409).json({
                        message: `Seat ${seatNum} is already booked`,
                    });
                }

                calculatedTotalPrice += seatObj.price;
                seatDetails.push({
                    seatNumber: seatObj.seatNumber,
                    seatClass: seatObj.seatClass,
                    position: seatObj.position,
                    price: seatObj.price,
                });
            }

            if (flight.availableSeats < normalizedSeats.length) {
                return res.status(400).json({
                    message: "Not enough available seats on this flight",
                });
            }

            // Atomic update on flight to prevent race condition / double booking
            const updatedFlight = await Flight.findOneAndUpdate(
                {
                    _id: targetFlightId,
                    seats: {
                        $all: normalizedSeats.map((seatNum) => ({
                            $elemMatch: { seatNumber: seatNum, status: "Available" },
                        })),
                    },
                    availableSeats: { $gte: normalizedSeats.length },
                },
                {
                    $set: {
                        "seats.$[elem].status": "Booked",
                    },
                    $inc: {
                        availableSeats: -normalizedSeats.length,
                    },
                },
                {
                    arrayFilters: [
                        {
                            "elem.seatNumber": { $in: normalizedSeats },
                            "elem.status": "Available",
                        },
                    ],
                    returnDocument: "after",
                }
            );

            if (!updatedFlight) {
                return res.status(409).json({
                    message: "One or more selected seats are no longer available. Please select different seats.",
                });
            }

            try {
                const booking = await Booking.create({
                    user: req.user._id,
                    flight: targetFlightId,
                    numberOfSeats: normalizedSeats.length,
                    selectedSeats: normalizedSeats,
                    seatDetails,
                    totalPrice: calculatedTotalPrice,
                    bookingStatus: "Confirmed",
                });

                const populatedBooking = await Booking.findById(booking._id)
                    .populate("user", "name email")
                    .populate(
                        "flight",
                        "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
                    );

                return res.status(201).json(populatedBooking);
            } catch (bookingError) {
                // Compensating rollback on failure
                await Flight.findByIdAndUpdate(
                    targetFlightId,
                    {
                        $set: { "seats.$[elem].status": "Available" },
                        $inc: { availableSeats: normalizedSeats.length },
                    },
                    {
                        arrayFilters: [
                            { "elem.seatNumber": { $in: normalizedSeats } },
                        ],
                    }
                );
                throw bookingError;
            }
        }

        // Branch 2: Legacy booking flow (no selectedSeats provided)
        const seatCount = Number(numberOfSeats);
        if (!Number.isInteger(seatCount) || seatCount < 1) {
            return res.status(400).json({
                message: "numberOfSeats must be a positive integer",
            });
        }

        if (flight.availableSeats < seatCount) {
            return res.status(400).json({
                message: "Not enough available seats",
            });
        }

        const updatedFlight = await Flight.findOneAndUpdate(
            {
                _id: targetFlightId,
                availableSeats: { $gte: seatCount },
            },
            {
                $inc: { availableSeats: -seatCount },
            },
            { returnDocument: "after" }
        );

        if (!updatedFlight) {
            return res.status(400).json({
                message: "Not enough available seats",
            });
        }

        const totalPrice = flight.price * seatCount;

        try {
            const booking = await Booking.create({
                user: req.user._id,
                flight: targetFlightId,
                numberOfSeats: seatCount,
                selectedSeats: [],
                seatDetails: [],
                totalPrice,
                bookingStatus: "Confirmed",
            });

            const populatedBooking = await Booking.findById(booking._id)
                .populate("user", "name email")
                .populate(
                    "flight",
                    "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
                );

            return res.status(201).json(populatedBooking);
        } catch (bookingError) {
            // Compensating rollback
            await Flight.findByIdAndUpdate(targetFlightId, {
                $inc: { availableSeats: seatCount },
            });
            throw bookingError;
        }
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
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
            )
            .sort({ createdAt: -1 });

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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID",
            });
        }

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        // Authorization check: only owner or admin can cancel
        if (
            booking.user.toString() !== req.user._id.toString() &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "Not authorized to cancel this booking",
            });
        }

        // Prevent double cancellation
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

        // Restore seats if seat selection was used
        if (booking.selectedSeats && booking.selectedSeats.length > 0) {
            await Flight.findByIdAndUpdate(
                booking.flight,
                {
                    $set: {
                        "seats.$[elem].status": "Available",
                    },
                    $inc: {
                        availableSeats: booking.selectedSeats.length,
                    },
                },
                {
                    arrayFilters: [
                        { "elem.seatNumber": { $in: booking.selectedSeats } },
                    ],
                }
            );
        } else {
            // Legacy booking seat restoration
            await Flight.findByIdAndUpdate(booking.flight, {
                $inc: {
                    availableSeats: booking.numberOfSeats,
                },
            });
        }

        booking.bookingStatus = "Cancelled";
        await booking.save();

        const populatedBooking = await Booking.findById(booking._id)
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
            );

        res.status(200).json(populatedBooking);
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
                "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
            )
            .sort({ createdAt: -1 });

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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID",
            });
        }

        const booking = await Booking.findById(id)
            .populate("user", "name email")
            .populate(
                "flight",
                "flightNumber airline departureCity arrivalCity departureTime arrivalTime price status"
            );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        // Authorization check: owner or admin
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
            (sum, booking) => sum + (booking.totalPrice || 0),
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