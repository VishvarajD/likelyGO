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



// Admin adds a question to a game
app.post("/api/games/:id/questions", async (req, res) => {
  const { id } = req.params; // game_id
  const { question_text, type } = req.body;

  try {
    // check if game exists
    const [games] = await pool.query("SELECT game_id FROM games WHERE game_id = ?", [id]);
    if (games.length === 0) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    // insert question
    const [result] = await pool.query(
      "INSERT INTO questions (game_id, question_text, type) VALUES (?, ?, ?)",
      [id, question_text, type]
    );

    res.json({
      success: true,
      questionId: result.insertId,
      gameId: id,
      question_text,
      type
    });
  } catch (err) {
    console.error("❌ Error adding question:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Get all questions for a game
app.get("/api/games/:id/questions", async (req, res) => {
  const { id } = req.params;

  try {
    // check if game exists
    const [games] = await pool.query("SELECT game_id FROM games WHERE game_id = ?", [id]);
    if (games.length === 0) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    // fetch questions
    const [questions] = await pool.query(
      "SELECT id, question_text, type, created_at FROM questions WHERE game_id = ? ORDER BY created_at ASC",
      [id]
    );

    res.json({
      success: true,
      gameId: id,
      questions
    });
  } catch (err) {
    console.error("❌ Error fetching questions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




// Participant votes for someone on a question
app.post("/api/questions/:id/vote", async (req, res) => {
  const { id } = req.params; // question_id
  const { voter_id, voted_for_id } = req.body;

  try {
    // check if question exists
    const [questions] = await pool.query("SELECT id FROM questions WHERE id = ?", [id]);
    if (questions.length === 0) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // check if voter already voted on this question
    const [existingVote] = await pool.query(
      "SELECT id FROM votes WHERE question_id = ? AND voter_id = ?",
      [id, voter_id]
    );
    if (existingVote.length > 0) {
      return res.status(400).json({ success: false, message: "You already voted on this question" });
    }

    // insert vote
    const [result] = await pool.query(
      "INSERT INTO votes (question_id, voter_id, voted_for_id) VALUES (?, ?, ?)",
      [id, voter_id, voted_for_id]
    );

    res.json({
      success: true,
      voteId: result.insertId,
      questionId: id,
      voter_id,
      voted_for_id
    });
  } catch (err) {
    console.error("❌ Error casting vote:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Get results for a question
app.get("/api/questions/:id/results", async (req, res) => {
  const { id } = req.params;

  try {
    // fetch vote counts per participant
    const [results] = await pool.query(
      `SELECT p.id as participant_id, p.name, COUNT(v.id) as votes
       FROM participants p
       LEFT JOIN votes v ON p.id = v.voted_for_id
       WHERE v.question_id = ?
       GROUP BY p.id, p.name
       ORDER BY votes DESC`,
      [id]
    );

    res.json({
      success: true,
      questionId: id,
      results
    });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
