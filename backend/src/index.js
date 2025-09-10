import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config({ path: '../.env' });

// console.log("ENV:", {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   pass: process.env.DB_PASS ? "SET" : "EMPTY",
//   db: process.env.DB_NAME
// })

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


// participant joins game using code
app.post("/api/games/:code/join", async (req, res) => {
  let { code } = req.params;
  const { name } = req.body;

  try {
    // normalize code
    code = code.trim().toUpperCase();
    console.log("Joining game with code:", code);

    // check if game exists
    const [games] = await pool.query(
      "SELECT game_id, code FROM games WHERE UPPER(code) = ?",
      [code]
    );
    console.log("Game lookup result:", games);

    if (games.length === 0) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    const gameId = games[0].game_id;

    // insert participant
    const [result] = await pool.query(
      "INSERT INTO participants (game_id, name) VALUES (?, ?)",
      [gameId, name]
    );

    res.json({
      success: true,
      participantId: result.insertId,
      gameId,
      name
    });
  } catch (err) {
    console.error("❌ Error joining game:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});







const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
