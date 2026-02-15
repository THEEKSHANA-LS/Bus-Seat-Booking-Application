import express from "express";
import db from "../../config/db.js"

const router = express.Router();

/**
 * GET /api/routes
 */
router.get("/routes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, from_city, to_city FROM routes ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/schedules?routeId=1
 */
router.get("/schedules", async (req, res) => {
  try {
    const { routeId } = req.query;
    if (!routeId) return res.status(400).json({ message: "routeId is required" });

    const [rows] = await db.query(
      `SELECT s.id, s.travel_date, s.travel_time, b.bus_name, b.total_seats, b.layout_type
       FROM schedules s
       JOIN buses b ON b.id = s.bus_id
       WHERE s.route_id = ?
       ORDER BY s.travel_date ASC, s.travel_time ASC`,
      [routeId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// helper: booking code like BK-20260215-483921
function makeBookingCode() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `BK-${yyyy}${mm}${dd}-${rand}`;
}

/**
 * GET /api/seats?scheduleId=10
 * returns: { bookedSeats: [1,2,10], totalSeats: 50, layout_type: "2x3" }
 */
router.get("/seats", async (req, res) => {
  try {
    const { scheduleId } = req.query;
    if (!scheduleId) return res.status(400).json({ message: "scheduleId is required" });

    // get bus info from schedule
    const [scheduleRows] = await db.query(
      `SELECT s.id, b.total_seats, b.layout_type
       FROM schedules s
       JOIN buses b ON b.id = s.bus_id
       WHERE s.id = ?`,
      [scheduleId]
    );

    if (scheduleRows.length === 0) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const { total_seats, layout_type } = scheduleRows[0];

    // get booked seats (only BOOKED)
    const [seatRows] = await db.query(
      `SELECT seat_number
       FROM bookings
       WHERE schedule_id = ? AND status = 'BOOKED'
       ORDER BY seat_number ASC`,
      [scheduleId]
    );

    const bookedSeats = seatRows.map((r) => r.seat_number);

    res.json({ bookedSeats, totalSeats: total_seats, layout_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/bookings
 * body: { schedule_id, seat_number, passenger_name, phone }
 * returns: { bookingId, bookingCode }
 */
router.post("/bookings", async (req, res) => {
  try {
    const { schedule_id, seat_number, passenger_name, phone } = req.body;

    if (!schedule_id || !seat_number || !passenger_name || !phone) {
      return res.status(400).json({
        message: "schedule_id, seat_number, passenger_name, phone are required",
      });
    }

    // validate seat_number range using bus total seats
    const [scheduleRows] = await db.query(
      `SELECT s.id, b.total_seats
       FROM schedules s
       JOIN buses b ON b.id = s.bus_id
       WHERE s.id = ?`,
      [schedule_id]
    );

    if (scheduleRows.length === 0) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const totalSeats = scheduleRows[0].total_seats;
    const seatNo = Number(seat_number);

    if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > totalSeats) {
      return res.status(400).json({ message: `seat_number must be 1 to ${totalSeats}` });
    }

    const bookingCode = makeBookingCode();

    try {
      const [result] = await db.query(
        `INSERT INTO bookings (booking_code, schedule_id, seat_number, passenger_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingCode, schedule_id, seatNo, passenger_name.trim(), phone.trim()]
      );

      return res.status(201).json({
        message: "Booking confirmed",
        bookingId: result.insertId,
        bookingCode,
      });
    } catch (err) {
      // This catches double booking because of UNIQUE(schedule_id, seat_number)
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Seat already taken. Please choose another seat." });
      }
      // booking_code unique collision (rare). Just retry once.
      if (err.code === "ER_DUP_ENTRY" && String(err.sqlMessage || "").includes("booking_code")) {
        return res.status(500).json({ message: "Please try again" });
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;