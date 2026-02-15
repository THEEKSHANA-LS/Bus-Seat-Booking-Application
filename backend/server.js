import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import adminAuthRoutes from "./src/routes/adminRoutes/adminAuthRoutes.js";
import adminRoutes from "./src/routes/adminRoutes/adminRoutes.js";
import publicRoutes from "./src/routes/passengerRoutes/publicRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running (ESM)" });
});

// public
app.use("/api", publicRoutes);

// admin auth + admin protected
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});