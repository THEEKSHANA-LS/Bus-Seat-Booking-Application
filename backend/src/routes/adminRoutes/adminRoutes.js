import express from "express";
import db from "../../config/db.js"
import { adminAuth } from "../../middleware/adminAuth.js";

const router = express.Router();

/**
 * POST /api/admin/routes
 * body: { from_city, to_city }
 */
router.post("/routes", adminAuth, async (req, res) => {
  try {
    const { from_city, to_city } = req.body;
    if (!from_city || !to_city) {
      return res.status(400).json({ message: "from_city and to_city are required" });
    }

    const [result] = await db.query(
      "INSERT INTO routes (from_city, to_city) VALUES (?, ?)",
      [from_city.trim(), to_city.trim()]
    );

    res.status(201).json({ message: "Route created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/admin/routes
 */
router.get("/routes", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, from_city, to_city, created_at FROM routes ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



/**
 * POST /api/admin/buses
 * body: { bus_name, plate_number, total_seats=50, layout_type="2x3" }
 */
router.post("/buses", adminAuth, async (req, res) => {
  try {
    const { bus_name, plate_number, total_seats = 50, layout_type = "2x3" } = req.body;

    if (!bus_name || !plate_number) {
      return res.status(400).json({ message: "bus_name and plate_number are required" });
    }

    const seats = Number(total_seats);
    if (!Number.isInteger(seats) || seats <= 0) {
      return res.status(400).json({ message: "total_seats must be a positive integer" });
    }

    // we keep your requirement: 50 seats 2x3
    if (layout_type !== "2x3") {
      return res.status(400).json({ message: "layout_type must be '2x3' for now" });
    }

    const [result] = await db.query(
      "INSERT INTO buses (bus_name, plate_number, total_seats, layout_type) VALUES (?, ?, ?, ?)",
      [bus_name.trim(), plate_number.trim(), seats, layout_type]
    );

    res.status(201).json({ message: "Bus created", id: result.insertId });
  } catch (err) {
    // duplicate plate_number
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "plate_number already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/admin/buses
 */
router.get("/buses", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, bus_name, plate_number, total_seats, layout_type, created_at FROM buses ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



/**
 * POST /api/admin/schedules
 * body: { route_id, bus_id, travel_date: "YYYY-MM-DD", travel_time: "HH:MM" }
 */
router.post("/schedules", adminAuth, async (req, res) => {
  try {
    const { route_id, bus_id, travel_date, travel_time } = req.body;

    if (!route_id || !bus_id || !travel_date || !travel_time) {
      return res.status(400).json({
        message: "route_id, bus_id, travel_date, travel_time are required",
      });
    }

    const [result] = await db.query(
      "INSERT INTO schedules (route_id, bus_id, travel_date, travel_time) VALUES (?, ?, ?, ?)",
      [route_id, bus_id, travel_date, travel_time]
    );

    res.status(201).json({ message: "Schedule created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/admin/schedules
 */
router.get("/schedules", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.travel_date, s.travel_time,
              r.from_city, r.to_city,
              b.bus_name, b.plate_number
       FROM schedules s
       JOIN routes r ON r.id = s.route_id
       JOIN buses b ON b.id = s.bus_id
       ORDER BY s.id DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;