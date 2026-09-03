const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Models
const User = require("./models/user");
const Flight = require("./models/flight");
const Booking = require("./models/booking");
const Payment = require("./models/payment");

// Routes
const userRoutes = require("./routes/userRoutes");
const flightRoutes = require("./routes/flightRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const TEST_DB_URI = "mongodb://localhost:27017/skylink_seat_test_suite";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_12345";
process.env.PORT = "0";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

let server;
let baseUrl;
let adminToken;
let user1Token;
let user2Token;
let adminUser;
let testUser1;
let testUser2;

const results = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function test(name, fn) {
    try {
        await fn();
        results.push({ name, status: "PASS" });
        console.log(`✅ [PASS] ${name}`);
    } catch (err) {
        results.push({ name, status: "FAIL", error: err.message });
        console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
}

async function apiRequest(endpoint, method = "GET", body = null, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function setup() {
    console.log("\n==========================================");
    console.log("   SKYLINK ETHIOPIA SEAT SYSTEM TESTS");
    console.log("==========================================\n");

    console.log("Connecting to test database:", TEST_DB_URI);
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.db.dropDatabase();
    console.log("Cleaned test database.\n");

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`Test server running at ${baseUrl}\n`);

    // Create users
    const adminPass = await bcrypt.hash("admin123", 10);
    adminUser = await User.create({
        name: "Admin User",
        email: "admin@skylink.et",
        password: adminPass,
        role: "admin",
    });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const user1Pass = await bcrypt.hash("user123", 10);
    testUser1 = await User.create({
        name: "Abebe Kebede",
        email: "abebe@example.com",
        password: user1Pass,
        role: "user",
    });
    user1Token = jwt.sign({ id: testUser1._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const user2Pass = await bcrypt.hash("user456", 10);
    testUser2 = await User.create({
        name: "Sara Bekele",
        email: "sara@example.com",
        password: user2Pass,
        role: "user",
    });
    user2Token = jwt.sign({ id: testUser2._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

async function teardown() {
    if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    }
    if (server) {
        server.close();
    }

    console.log("\n==========================================");
    console.log("           TEST RUN SUMMARY");
    console.log("==========================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed:      ${passed}`);
    console.log(`Failed:      ${failed}`);
    console.log("==========================================\n");

    if (failed > 0) {
        process.exit(1);
    }
}

async function runAllTests() {
    let flightWithSeatsId;
    let legacyFlightId;
    let oneSeatBookingId;
    let multiSeatBookingId;
    let paymentId;

    // A. Existing flight retrieval
    await test("A. Create and retrieve flight without seats (Legacy flight)", async () => {
        const createRes = await apiRequest("/api/flights", "POST", {
            flightNumber: "ET-101",
            airline: "Ethiopian Airlines",
            departureCity: "Addis Ababa",
            arrivalCity: "Dire Dawa",
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 90000000).toISOString(),
            price: 2500,
            totalSeats: 50,
            availableSeats: 50,
        }, adminToken);
        assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
        legacyFlightId = createRes.data.flight._id;

        const getRes = await apiRequest(`/api/flights/${legacyFlightId}`, "GET");
        assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
        assert(getRes.data.flightNumber === "ET-101", "Flight number match");
        assert(Array.isArray(getRes.data.seats), "Seats is an array");
        assert(getRes.data.seats.length === 0, "Seats array is empty for legacy flight");
    });

    // B. Flight seat retrieval
    await test("B. Flight seat retrieval on empty seats flight", async () => {
        const res = await apiRequest(`/api/flights/${legacyFlightId}/seats`, "GET");
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.seats.length === 0, "Seats is empty");
        assert(res.data.totalSeats === 50, "Total seats matches");
    });

    // C. Admin seat configuration (POST & Auto-generate)
    await test("C1. Admin seat configuration via POST /api/flights/:id/seats", async () => {
        // Create a new flight to configure
        const createFlightRes = await apiRequest("/api/flights", "POST", {
            flightNumber: "ET-202",
            airline: "Ethiopian Airlines",
            departureCity: "Addis Ababa",
            arrivalCity: "Bahir Dar",
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 90000000).toISOString(),
            price: 2800,
            totalSeats: 6,
            availableSeats: 6,
        }, adminToken);
        assert(createFlightRes.status === 201, "Flight created");
        flightWithSeatsId = createFlightRes.data.flight._id;

        const seatConfig = [
            { seatNumber: "1A", seatClass: "Business", position: "Window", price: 5000, status: "Available" },
            { seatNumber: "1B", seatClass: "Business", position: "Aisle", price: 5000, status: "Available" },
            { seatNumber: "1C", seatClass: "Business", position: "Aisle", price: 5000, status: "Available" },
            { seatNumber: "1D", seatClass: "Business", position: "Window", price: 5000, status: "Available" },
            { seatNumber: "2A", seatClass: "Economy", position: "Window", price: 3000, status: "Available" },
            { seatNumber: "2B", seatClass: "Economy", position: "Middle", price: 2800, status: "Available" },
            { seatNumber: "2C", seatClass: "Economy", position: "Aisle", price: 3200, status: "Available" },
            { seatNumber: "2D", seatClass: "Economy", position: "Aisle", price: 3200, status: "Available" },
            { seatNumber: "2E", seatClass: "Economy", position: "Middle", price: 2800, status: "Available" },
            { seatNumber: "2F", seatClass: "Economy", position: "Window", price: 2500, status: "Available" },
        ];

        const configRes = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: seatConfig,
        }, adminToken);
        assert(configRes.status === 200, `Expected 200, got ${configRes.status}: ${JSON.stringify(configRes.data)}`);
        assert(configRes.data.flight.seats.length === 10, "Configured 10 seats");
        assert(configRes.data.flight.totalSeats === 10, "totalSeats updated to 10");
        assert(configRes.data.flight.availableSeats === 10, "availableSeats updated to 10");
    });

    await test("C2. Admin auto-generate seats via POST /api/flights/:id/generate-seats", async () => {
        const genFlightRes = await apiRequest("/api/flights", "POST", {
            flightNumber: "ET-303",
            airline: "Ethiopian Airlines",
            departureCity: "Addis Ababa",
            arrivalCity: "Gondar",
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 90000000).toISOString(),
            price: 2500,
            totalSeats: 20,
            availableSeats: 20,
        }, adminToken);
        const genFlightId = genFlightRes.data.flight._id;

        const genRes = await apiRequest(`/api/flights/${genFlightId}/generate-seats`, "POST", {
            economyPrice: 3000,
            businessPrice: 6000,
            businessRows: 2,
            economyRows: 4,
        }, adminToken);
        assert(genRes.status === 200, `Expected 200, got ${genRes.status}`);
        assert(genRes.data.flight.seats.length === 36, `Expected 36 generated seats, got ${genRes.data.flight.seats.length}`);
        assert(genRes.data.flight.seats[0].seatNumber === "1A", "First seat is 1A");
        assert(genRes.data.flight.seats[0].seatClass === "Business", "1A is Business");
        assert(genRes.data.flight.seats[0].price === 6000, "1A price is 6000");
        assert(genRes.data.flight.seats[12].seatClass === "Economy", "3A is Economy");
        assert(genRes.data.flight.seats[12].price === 3000, "3A price is 3000");
    });

    // D. Normal user attempting seat configuration (Forbidden 403)
    await test("D. Normal user attempting seat configuration returns 403", async () => {
        const res = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: [{ seatNumber: "1A", seatClass: "Economy", position: "Window", price: 1000, status: "Available" }],
        }, user1Token);
        assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    });

    // E. One-seat booking
    await test("E. One-seat booking with server-side pricing", async () => {
        // Seat 1A is Business, price: 5000
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["1A"],
            // frontend tries to send manipulated totalPrice - backend must calculate accurately
            totalPrice: 100,
        }, user1Token);

        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
        assert(res.data.numberOfSeats === 1, "numberOfSeats is 1");
        assert(res.data.selectedSeats.length === 1 && res.data.selectedSeats[0] === "1A", "selectedSeats has 1A");
        assert(res.data.totalPrice === 5000, `Expected totalPrice to be 5000 (server-calculated), got ${res.data.totalPrice}`);
        oneSeatBookingId = res.data._id;

        // Verify flight seat status updated to Booked and availableSeats decremented
        const seatRes = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "GET");
        const seat1A = seatRes.data.seats.find((s) => s.seatNumber === "1A");
        assert(seat1A.status === "Booked", "Seat 1A status is now Booked");
        assert(seatRes.data.availableSeats === 9, `availableSeats decremented to 9, got ${seatRes.data.availableSeats}`);
    });

    // F. Multiple-seat booking
    await test("F. Multiple-seat booking with combined pricing", async () => {
        // User selects: 1C (Business: 5000), 2A (Economy: 3000), 2F (Economy: 2500) -> Total: 10500
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["1C", "2A", "2F"],
        }, user2Token);

        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
        assert(res.data.numberOfSeats === 3, "numberOfSeats is 3");
        assert(res.data.selectedSeats.length === 3, "selectedSeats length is 3");
        assert(res.data.totalPrice === 10500, `Expected totalPrice 10500 (5000+3000+2500), got ${res.data.totalPrice}`);
        assert(res.data.seatDetails.length === 3, "seatDetails length is 3");
        multiSeatBookingId = res.data._id;

        // Verify flight availableSeats decremented by 3
        const seatRes = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "GET");
        assert(seatRes.data.availableSeats === 6, `Expected 6 available seats, got ${seatRes.data.availableSeats}`);
    });

    // G. Different seat prices calculation check
    await test("G. Verify pricing calculation matches individual seat prices (1B: 5000 + 2C: 3200 = 8200)", async () => {
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["1B", "2C"],
        }, user1Token);

        assert(res.status === 201, `Expected 201, got ${res.status}`);
        assert(res.data.totalPrice === 8200, `Expected 8200, got ${res.data.totalPrice}`);
    });

    // H. Duplicate seat selection in single request
    await test("H. Duplicate seat selection in single booking request returns 400", async () => {
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["2B", "2B"],
        }, user1Token);

        assert(res.status === 400, `Expected 400 for duplicate seats, got ${res.status}`);
    });

    // I. Nonexistent seat
    await test("I. Booking nonexistent seat returns 404/400", async () => {
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["99Z"],
        }, user1Token);

        assert(res.status === 404 || res.status === 400, `Expected 404/400 for nonexistent seat, got ${res.status}`);
    });

    // J. Already booked seat (Double booking attempt)
    await test("J. Booking an already booked seat (1A) returns 409/400", async () => {
        const res = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["1A"],
        }, user2Token);

        assert(res.status === 409 || res.status === 400, `Expected 409/400 Conflict, got ${res.status}`);
    });

    // K & L. Cancel booking and seat restoration
    await test("K & L. Cancel booking restores seats to Available and increments availableSeats", async () => {
        // Cancel the one-seat booking (1A)
        const cancelRes = await apiRequest(`/api/bookings/${oneSeatBookingId}/cancel`, "PUT", {}, user1Token);
        assert(cancelRes.status === 200, `Expected 200, got ${cancelRes.status}`);
        assert(cancelRes.data.bookingStatus === "Cancelled", "Booking status is Cancelled");

        // Verify seat 1A is now Available again
        const seatRes = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "GET");
        const seat1A = seatRes.data.seats.find((s) => s.seatNumber === "1A");
        assert(seat1A.status === "Available", "Seat 1A restored to Available");

        // Now another user can book 1A!
        const rebookRes = await apiRequest("/api/bookings", "POST", {
            flightId: flightWithSeatsId,
            selectedSeats: ["1A"],
        }, user2Token);
        assert(rebookRes.status === 201, `Expected 201 for rebooking restored seat, got ${rebookRes.status}`);
    });

    // M. Double cancellation
    await test("M. Double cancellation returns 400", async () => {
        const cancelRes = await apiRequest(`/api/bookings/${oneSeatBookingId}/cancel`, "PUT", {}, user1Token);
        assert(cancelRes.status === 400, `Expected 400 for double cancellation, got ${cancelRes.status}`);
        assert(cancelRes.data.message.toLowerCase().includes("already"), "Error mentions already cancelled");
    });

    // N. Booking retrieval
    await test("N. Booking retrieval includes selectedSeats, seatDetails, flight and user details", async () => {
        // getMyBookings
        const myBookingsRes = await apiRequest("/api/bookings/my-bookings", "GET", null, user2Token);
        assert(myBookingsRes.status === 200, `Expected 200, got ${myBookingsRes.status}`);
        assert(Array.isArray(myBookingsRes.data), "Bookings is an array");
        const user2MultiBooking = myBookingsRes.data.find((b) => b._id === multiSeatBookingId);
        assert(user2MultiBooking, "Found multi-seat booking");
        assert(user2MultiBooking.selectedSeats.length === 3, "Has 3 selected seats");
        assert(user2MultiBooking.flight.flightNumber === "ET-202", "Flight populated");

        // getBookingById
        const singleBookingRes = await apiRequest(`/api/bookings/${multiSeatBookingId}`, "GET", null, user2Token);
        assert(singleBookingRes.status === 200, `Expected 200, got ${singleBookingRes.status}`);
        assert(singleBookingRes.data.totalPrice === 10500, "totalPrice is 10500");

        // getAllBookings (admin)
        const allBookingsRes = await apiRequest("/api/bookings", "GET", null, adminToken);
        assert(allBookingsRes.status === 200, `Expected 200, got ${allBookingsRes.status}`);
        assert(allBookingsRes.data.length >= 3, "Admin sees all bookings");
    });

    // O. Payment compatibility
    await test("O. Payment creation uses booking totalPrice and confirmation succeeds", async () => {
        const payCreateRes = await apiRequest("/api/payments", "POST", {
            bookingId: multiSeatBookingId,
        }, user2Token);
        assert(payCreateRes.status === 201, `Expected 201, got ${payCreateRes.status}`);
        assert(payCreateRes.data.amount === 10500, `Expected payment amount 10500, got ${payCreateRes.data.amount}`);
        paymentId = payCreateRes.data._id;

        const payConfirmRes = await apiRequest(`/api/payments/${paymentId}/confirm`, "PUT", {}, user2Token);
        assert(payConfirmRes.status === 200, `Expected 200, got ${payConfirmRes.status}`);
        assert(payConfirmRes.data.payment.paymentStatus === "Paid", "Payment status is Paid");
    });

    // P. Booking statistics
    await test("P. Booking statistics correctly computes counts and totalRevenue", async () => {
        const statsRes = await apiRequest("/api/bookings/stats", "GET", null, adminToken);
        assert(statsRes.status === 200, `Expected 200, got ${statsRes.status}`);
        assert(statsRes.data.totalBookings >= 3, "totalBookings counted");
        assert(statsRes.data.cancelledBookings >= 1, "cancelledBookings counted");
        assert(statsRes.data.totalRevenue > 0, `totalRevenue calculated: ${statsRes.data.totalRevenue}`);
    });

    // Q. Existing flights without seat configuration (Backward compatibility)
    await test("Q. Backward compatibility: booking on legacy flight without selectedSeats", async () => {
        const legacyBookingRes = await apiRequest("/api/bookings", "POST", {
            flightId: legacyFlightId,
            numberOfSeats: 2,
        }, user1Token);

        assert(legacyBookingRes.status === 201, `Expected 201, got ${legacyBookingRes.status}`);
        assert(legacyBookingRes.data.numberOfSeats === 2, "numberOfSeats is 2");
        assert(legacyBookingRes.data.totalPrice === 5000, `Expected 5000 (2500*2), got ${legacyBookingRes.data.totalPrice}`);
        assert(Array.isArray(legacyBookingRes.data.selectedSeats) && legacyBookingRes.data.selectedSeats.length === 0, "selectedSeats is empty array");

        // Verify availableSeats on flight decremented
        const flRes = await apiRequest(`/api/flights/${legacyFlightId}`, "GET");
        assert(flRes.data.availableSeats === 48, `Expected 48 available seats, got ${flRes.data.availableSeats}`);
    });

    // R. Existing bookings cancellation
    await test("R. Cancelling legacy booking restores availableSeats properly", async () => {
        const legacyBookingRes = await apiRequest("/api/bookings", "POST", {
            flightId: legacyFlightId,
            numberOfSeats: 3,
        }, user1Token);
        assert(legacyBookingRes.status === 201, "Legacy booking created");

        const cancelRes = await apiRequest(`/api/bookings/${legacyBookingRes.data._id}/cancel`, "PUT", {}, user1Token);
        assert(cancelRes.status === 200, "Legacy booking cancelled");

        const flRes = await apiRequest(`/api/flights/${legacyFlightId}`, "GET");
        assert(flRes.data.availableSeats === 48, `Expected 48 available seats restored, got ${flRes.data.availableSeats}`);
    });

    // S. Invalid input tests
    await test("S1. Invalid seatClass returns 400", async () => {
        const res = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: [{ seatNumber: "9A", seatClass: "FirstClass", position: "Window", price: 1000 }],
        }, adminToken);
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("S2. Negative seat price returns 400", async () => {
        const res = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: [{ seatNumber: "9A", seatClass: "Economy", position: "Window", price: -500 }],
        }, adminToken);
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("S3. Duplicate seatNumber in admin configuration returns 400", async () => {
        const res = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: [
                { seatNumber: "9A", seatClass: "Economy", position: "Window", price: 2000 },
                { seatNumber: "9A", seatClass: "Economy", position: "Aisle", price: 2000 },
            ],
        }, adminToken);
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("S4. Admin removing currently booked seat returns 400", async () => {
        // Seat 1A is currently booked by user2
        const res = await apiRequest(`/api/flights/${flightWithSeatsId}/seats`, "POST", {
            seats: [
                { seatNumber: "10A", seatClass: "Economy", position: "Window", price: 2000 },
            ],
        }, adminToken);
        assert(res.status === 400, `Expected 400 when attempting to remove booked seat, got ${res.status}`);
        assert(res.data.message.includes("currently booked"), "Message explains seat is booked");
    });

    // T. Concurrent / Double-booking protection test
    await test("T. Concurrency: Simultaneous booking requests for the exact same seat", async () => {
        // Setup fresh flight with seat 10X available
        const createFlightRes = await apiRequest("/api/flights", "POST", {
            flightNumber: "ET-RACE",
            airline: "Ethiopian Airlines",
            departureCity: "Addis Ababa",
            arrivalCity: "Hawassa",
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 90000000).toISOString(),
            price: 2000,
            seats: [
                { seatNumber: "10X", seatClass: "Economy", position: "Window", price: 2000, status: "Available" },
                { seatNumber: "10Y", seatClass: "Economy", position: "Aisle", price: 2000, status: "Available" },
            ],
        }, adminToken);
        const raceFlightId = createFlightRes.data.flight._id;

        // Fire 2 simultaneous booking requests for seat 10X
        const req1 = apiRequest("/api/bookings", "POST", {
            flightId: raceFlightId,
            selectedSeats: ["10X"],
        }, user1Token);

        const req2 = apiRequest("/api/bookings", "POST", {
            flightId: raceFlightId,
            selectedSeats: ["10X"],
        }, user2Token);

        const [res1, res2] = await Promise.all([req1, req2]);

        const statuses = [res1.status, res2.status].sort();
        console.log(`    Concurrency results: Request 1 = ${res1.status}, Request 2 = ${res2.status}`);

        // Exactly one should succeed with 201, and one should fail with 409 or 400
        assert(
            (statuses[0] === 201 && (statuses[1] === 409 || statuses[1] === 400)) ||
            (statuses[0] === 400 && statuses[1] === 201),
            `Expected exactly one 201 and one 409/400, got ${statuses[0]} and ${statuses[1]}`
        );

        // Verify only 1 booking was created and availableSeats is 1
        const raceFlightCheck = await apiRequest(`/api/flights/${raceFlightId}`, "GET");
        assert(raceFlightCheck.data.availableSeats === 1, `Expected 1 available seat left, got ${raceFlightCheck.data.availableSeats}`);
    });
}

async function main() {
    try {
        await setup();
        await runAllTests();
    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        await teardown();
    }
}

main();