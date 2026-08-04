const Flight = require("../models/flight");
const createFlight = async (req, res) => {
    try {
        const flight = await Flight.create(req.body);

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
//getting all flights
const getFlights = async (req, res) => {  
    try {
        const { departureCity, 
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

        if(status){
            filter.status=status;
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
//getting one flight
const getFlightById = async (req, res) => {
    try {
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

const updateFlight = async (req, res) => {
    try {

        const flight = await Flight.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        res.status(200).json({
            message: "Flight updated successfully",
            flight,
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });

    }
};

const deleteFlight = async (req, res) => {
    try {

        const flight = await Flight.findByIdAndDelete(req.params.id);

        if (!flight) {
            return res.status(404).json({
                message: "Flight not found",
            });
        }

        res.status(200).json({
            message: "Flight deleted successfully",
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
    updateFlight,
    deleteFlight,
};