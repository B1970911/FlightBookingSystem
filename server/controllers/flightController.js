const mongoose = require("mongoose");
const Flight = require("../models/flight");
const Booking = require("../models/booking");

// Helper function to validate a single seat object
const validateSeatObject = (seat, index) => {
    if (!seat || typeof seat !== "object") {
        return `Seat at index ${index} must be an object`;
    }
    if (!seat.seatNumber || typeof seat.seatNumber !== "string" || !seat.seatNumber.trim()) {
        return `Seat at index ${index} must have a valid seatNumber`;
    }
    const allowedClasses = ["Economy", "Business"];
    if (!seat.seatClass || !allowedClasses.includes(seat.seatClass)) {
        return `Seat ${seat.seatNumber} has invalid seatClass. Allowed values: ${allowedClasses.join(", ")}`;
    }
    const allowedPositions = ["Window", "Middle", "Aisle"];
    if (!seat.position || !allowedPositions.includes(seat.position)) {
        return `Seat ${seat.seatNumber} has invalid position. Allowed values: ${allowedPositions.join(", ")}`;
    }
    if (typeof seat.price !== "number" || isNaN(seat.price) || seat.price < 0) {
        return `Seat ${seat.seatNumber} must have a non-negative price`;
    }
    if (seat.status && !["Available", "Booked"].includes(seat.status)) {
        return `Seat ${seat.seatNumber} has invalid status. Allowed values: Available, Booked`;
    }
    return null;
};

// Helper function to validate an array of seats
const validateSeatsArray = (seats) => {
    if (!Array.isArray(seats)) {
        return { error: "seats must be an array" };
    }
    if (seats.length === 0) {
        return { error: "seats array cannot be empty" };
    }
    const seenSeats = new Set();
    const formattedSeats = [];

    for (let i = 0; i < seats.length; i++) {
        const error = validateSeatObject(seats[i], i);
        if (error) {
            return { error };
        }
        const seatNum = seats[i].seatNumber.trim().toUpperCase();
        if (seenSeats.has(seatNum)) {
            return { error: `Duplicate seatNumber found: ${seatNum}` };
        }
        seenSeats.add(seatNum);

        formattedSeats.push({
            seatNumber: seatNum,
            seatClass: seats[i].seatClass,
            position: seats[i].position,
            price: Number(seats[i].price),
            status: seats[i].status || "Available",
        });
    }

    return { seats: formattedSeats };
};

const createFlight = async (req, res) => {
    try {
        const flightData = { ...req.body };

        if (flightData.seats && Array.isArray(flightData.seats) && flightData.seats.length > 0) {
            const { error, seats } = validateSeatsArray(flightData.seats);
            if (error) {
                return res.status(400).json({ message: error });
            }
            flightData.seats = seats;
            flightData.totalSeats = seats.length;
            flightData.availableSeats = seats.filter((s) => s.status === "Available").length;
        } else {
            if (flightData.availableSeats === undefined && flightData.totalSeats !== undefined) {
                flightData.availableSeats = flightData.totalSeats;
            }
        }

        const flight = await Flight.create(flightData);

        res.status(201).json({
            message: "Flight created successfully",
            flight,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// getting all flights
const getFlights = async (req, res) => {
    try {
        const {
            departureCity,
            arrivalCity,
            airline,
            status,
            minPrice,
            maxPrice,
        } = req.query;

        const filter = {};

        if (departureCity) {
            filter.departureCity = departureCity;
        }

        if (arrivalCity) {
            filter.arrivalCity = arrivalCity;
        }

        if (airline) {
            filter.airline = airline;
        }

        if (status) {
            filter.status = status;
        }

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        const flights = await Flight.find(filter);

        res.status(200).json(flights);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// getting one flight
const getFlightById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        res.status(200).json(flight);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// getting flight seats
const getFlightSeats = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        res.status(200).json({
            flightId: flight._id,
            flightNumber: flight.flightNumber,
            totalSeats: flight.totalSeats,
            availableSeats: flight.availableSeats,
            seats: flight.seats || [],
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// admin configuring flight seat map
const configureFlightSeats = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        const { error, seats } = validateSeatsArray(req.body.seats);
        if (error) {
            return res.status(400).json({ message: error });
        }

        // Safety check against existing confirmed bookings
        const activeBookings = await Booking.find({
            flight: flight._id,
            bookingStatus: "Confirmed",
        });

        const bookedSeatNumbers = new Set(
            activeBookings.flatMap((b) => b.selectedSeats || [])
        );

        const newSeatMap = new Map(seats.map((s) => [s.seatNumber, s]));

        for (const bookedSeatNum of bookedSeatNumbers) {
            if (!newSeatMap.has(bookedSeatNum)) {
                return res.status(400).json({
                    message: `Cannot remove seat ${bookedSeatNum} because it is currently booked by an active booking.`,
                });
            }
            // Ensure booked seats remain booked
            newSeatMap.get(bookedSeatNum).status = "Booked";
        }

        const finalSeats = Array.from(newSeatMap.values());
        flight.seats = finalSeats;
        flight.totalSeats = finalSeats.length;
        flight.availableSeats = finalSeats.filter((s) => s.status === "Available").length;

        await flight.save();

        res.status(200).json({
            message: "Flight seats configured successfully",
            flight,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// admin auto-generating standard seat map for a flight
const generateFlightSeats = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        // Safety check: Cannot regenerate if active bookings exist
        const activeBookings = await Booking.find({
            flight: flight._id,
            bookingStatus: "Confirmed",
        });
        if (activeBookings.length > 0) {
            return res.status(400).json({
                message: "Cannot regenerate seats for a flight with active confirmed bookings.",
            });
        }

        const positionPriceKeys = [
            "businessWindowPrice",
            "businessMiddlePrice",
            "businessAislePrice",
            "economyWindowPrice",
            "economyMiddlePrice",
            "economyAislePrice",
        ];

        const hasAnyPositionPrice = positionPriceKeys.some(
            (key) => req.body[key] !== undefined
        );

        const isLegacyGenerate =
            !hasAnyPositionPrice &&
            (req.body.economyPrice !== undefined || req.body.businessPrice !== undefined);

        let businessRows;
        let economyRows;
        let businessPrice;
        let economyPrice;

        if (isLegacyGenerate) {
            if (
                req.body.economyPrice !== undefined &&
                (typeof req.body.economyPrice !== "number" || req.body.economyPrice < 0 || isNaN(req.body.economyPrice))
            ) {
                return res.status(400).json({ message: "economyPrice must be a non-negative number" });
            }
            if (
                req.body.businessPrice !== undefined &&
                (typeof req.body.businessPrice !== "number" || req.body.businessPrice < 0 || isNaN(req.body.businessPrice))
            ) {
                return res.status(400).json({ message: "businessPrice must be a non-negative number" });
            }

            economyPrice =
                typeof req.body.economyPrice === "number" && req.body.economyPrice >= 0
                    ? req.body.economyPrice
                    : flight.price;
            businessPrice =
                typeof req.body.businessPrice === "number" && req.body.businessPrice >= 0
                    ? req.body.businessPrice
                    : Math.round(economyPrice * 1.5);

            businessRows =
                typeof req.body.businessRows === "number" && req.body.businessRows >= 0
                    ? req.body.businessRows
                    : 2;
            economyRows =
                typeof req.body.economyRows === "number" && req.body.economyRows > 0
                    ? req.body.economyRows
                    : 8;
        } else {
            // New 6-position price configuration: Validate row counts
            if (
                req.body.businessRows === undefined ||
                typeof req.body.businessRows !== "number" ||
                isNaN(req.body.businessRows) ||
                !Number.isInteger(req.body.businessRows) ||
                req.body.businessRows < 0
            ) {
                return res.status(400).json({
                    message: "businessRows must be a non-negative integer",
                });
            }

            if (
                req.body.economyRows === undefined ||
                typeof req.body.economyRows !== "number" ||
                isNaN(req.body.economyRows) ||
                !Number.isInteger(req.body.economyRows) ||
                req.body.economyRows < 1
            ) {
                return res.status(400).json({
                    message: "economyRows must be an integer of at least 1",
                });
            }

            businessRows = req.body.businessRows;
            economyRows = req.body.economyRows;

            // Validate all 6 position prices: missing, non-numeric, negative
            for (const key of positionPriceKeys) {
                if (req.body[key] === undefined || req.body[key] === null || req.body[key] === "") {
                    return res.status(400).json({
                        message: `Missing required price: ${key}`,
                    });
                }
                if (typeof req.body[key] !== "number" || isNaN(req.body[key])) {
                    return res.status(400).json({
                        message: `Price ${key} must be a valid number`,
                    });
                }
                if (req.body[key] < 0) {
                    return res.status(400).json({
                        message: `Price ${key} must be a non-negative number`,
                    });
                }
            }
        }

        const letters = ["A", "B", "C", "D", "E", "F"];
        const positionMap = {
            A: "Window",
            B: "Middle",
            C: "Aisle",
            D: "Aisle",
            E: "Middle",
            F: "Window",
        };

        const generatedSeats = [];
        const totalRows = businessRows + economyRows;

        for (let r = 1; r <= totalRows; r++) {
            for (const letter of letters) {
                // Determine position first: A/F = Window, B/E = Middle, C/D = Aisle
                const position = positionMap[letter];

                // Determine cabin class
                const seatClass = r <= businessRows ? "Business" : "Economy";

                // Assign price using position and cabin class
                let price;
                if (isLegacyGenerate) {
                    price = seatClass === "Business" ? businessPrice : economyPrice;
                } else {
                    if (seatClass === "Business") {
                        if (position === "Window") {
                            price = req.body.businessWindowPrice;
                        } else if (position === "Middle") {
                            price = req.body.businessMiddlePrice;
                        } else {
                            price = req.body.businessAislePrice;
                        }
                    } else {
                        if (position === "Window") {
                            price = req.body.economyWindowPrice;
                        } else if (position === "Middle") {
                            price = req.body.economyMiddlePrice;
                        } else {
                            price = req.body.economyAislePrice;
                        }
                    }
                }

                generatedSeats.push({
                    seatNumber: `${r}${letter}`,
                    seatClass,
                    position,
                    price,
                    status: "Available",
                });
            }
        }

        flight.seats = generatedSeats;
        flight.totalSeats = generatedSeats.length;
        flight.availableSeats = generatedSeats.length;

        await flight.save();

        res.status(200).json({
            message: "Flight seat map generated successfully",
            flight,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const updateFlight = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        const updateData = { ...req.body };

        if (updateData.seats) {
            const { error, seats } = validateSeatsArray(updateData.seats);
            if (error) {
                return res.status(400).json({ message: error });
            }

            const activeBookings = await Booking.find({
                flight: flight._id,
                bookingStatus: "Confirmed",
            });
            const bookedSeatNumbers = new Set(
                activeBookings.flatMap((b) => b.selectedSeats || [])
            );

            const newSeatMap = new Map(seats.map((s) => [s.seatNumber, s]));
            for (const bookedSeatNum of bookedSeatNumbers) {
                if (!newSeatMap.has(bookedSeatNum)) {
                    return res.status(400).json({
                        message: `Cannot remove seat ${bookedSeatNum} because it is currently booked by an active booking.`,
                    });
                }
                newSeatMap.get(bookedSeatNum).status = "Booked";
            }

            updateData.seats = Array.from(newSeatMap.values());
            updateData.totalSeats = updateData.seats.length;
            updateData.availableSeats = updateData.seats.filter(
                (s) => s.status === "Available"
            ).length;
        }

        const updatedFlight = await Flight.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        res.status(200).json({
            message: "Flight updated successfully",
            flight: updatedFlight,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const deleteFlight = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        const activeBookings = await Booking.countDocuments({
            flight: req.params.id,
            bookingStatus: "Confirmed",
        });

        if (activeBookings > 0) {
            return res.status(409).json({
                message: "Cannot delete flight because it has active bookings.",
                activeBookings,
            });
        }

        await Flight.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Flight deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const cancelFlight = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid flight ID",
            });
        }

        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        if (flight.status === "Cancelled") {
            return res.status(400).json({
                message: "Flight is already cancelled",
            });
        }

        flight.status = "Cancelled";
        await flight.save();

        res.status(200).json({
            message: "Flight cancelled successfully",
            flight,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createFlight,
    getFlights,
    getFlightById,
    getFlightSeats,
    configureFlightSeats,
    generateFlightSeats,
    updateFlight,
    deleteFlight,
    cancelFlight,
};