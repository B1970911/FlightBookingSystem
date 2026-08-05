const Booking = require("../models/booking");
const Flight = require("../models/flight");

const createBooking = async (req, res) => {
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

    await flight.save();   //saves the uptated flight on the database

    res.status(201).json(booking);  
};
const getMyBookings = async (req, res) => {
    const bookings = await Booking.find({
        user: req.user._id,
    })
    //mongoose will fetch the specified user and flight document
    .populate("user", "name email")
    .populate("flight","flightNumber departureCity arrivalCity departureTime price");  

    res.status(200).json(bookings);

};
const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
        return res.status(404).json({
            message: "Booking not found",
        });
    }
    //to prevent double cancellation
    if (booking.bookingStatus === "Cancelled") {
        return res.status(400).json({
            message: "Booking is already cancelled",
        });
    }
    const flight = await Flight.findById(booking.flight);

    if(!flight){
        return res.status(404).json({
            message: "Flight not found",
        });
    }
    
    flight.availableSeats += booking.numberOfSeats;   //restores the number of seats after cancellation
    booking.bookingStatus = "Cancelled";
    
    await flight.save();
    await booking.save();  
    
    res.status(200).json(booking);

};
module.exports = {
    createBooking,
    getMyBookings,
    cancelBooking,
};