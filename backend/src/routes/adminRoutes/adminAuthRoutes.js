import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../config/db.js"

const router = express.Router();

/**
 * POST /api/admin/auth/register
 * body: { username, password }
 * Use only once to create the first admin.
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "password must be at least 4 characters" });
    }

    // check existing
    const [existing] = await db.query("SELECT id FROM admin_users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
      [username, passwordHash]
    );

    return res.status(201).json({ message: "Admin registered", adminId: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/admin/auth/login
 * body: { username, password }
 * returns: { token }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const [rows] = await db.query(
      "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;