import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config({ path: '../.env' });

console.log("ENV:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS ? "SET" : "EMPTY",
  db: process.env.DB_NAME
})

const app = express();
app.use(cors());
app.use(express.json());


// Utility function to generate random code
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log("✅ Database connected! Test result:", rows[0].result);
  } catch (err) {
    console.error("❌ DB Connection failed:", err.message);
  }
})();

// Create Game API
app.post("/api/game/create", async (req, res) => {
  try {
    const { type } = req.body;
    const code = generateCode();

    const [result] = await pool.query(
      "INSERT INTO games (code, type) VALUES (?, ?)",
      [code, type]
    );
    

    res.status(201).json({
      success: true,
      gameId: result.insertId,
      code,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
