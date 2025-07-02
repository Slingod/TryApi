const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// === INIT DB ===
const db = new sqlite3.Database(path.join(__dirname, "quiz.db"));
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      score INTEGER DEFAULT 0,
      badges TEXT DEFAULT '[]'
    )
  `);
});

// Serve favicon to avoid 404
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.ico"));
});

// Root handler
app.get("/", (req, res) => {
  res.send("🛠️ Backend Monde Savoir en service sur /");
});

// ➕ Create user
app.post("/users", (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === "") {
    return res.status(400).json({ error: "Nom requis" });
  }
  db.run(
    "INSERT INTO users (username) VALUES (?)",
    [username.trim()],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: this.lastID, username, score: 0, badges: [] });
    }
  );
});

// 📄 Get all users
app.get("/users", (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🔍 Get single user by ID
app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  });
});

// 🏅 Update score & badges
app.post("/users/:id/score", (req, res) => {
  const userId = req.params.id;
  const { delta } = req.body;
  if (typeof delta !== "number") {
    return res.status(400).json({ error: "Delta is required and must be a number" });
  }
  db.get("SELECT score, badges FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });

    const newScore = row.score + delta;
    let badges = JSON.parse(row.badges || "[]");
    const badgeList = [
      { score: 10, name: "Novice" },
      { score: 25, name: "Apprenti" },
      { score: 50, name: "Connaisseur" },
      { score: 100, name: "Expert" },
      { score: 250, name: "Incollable" },
      { score: 1000, name: "Omniscient" },
    ];
    badgeList.forEach(b => {
      if (newScore >= b.score && !badges.includes(b.name)) {
        badges.push(b.name);
      }
    });

    db.run(
      "UPDATE users SET score = ?, badges = ? WHERE id = ?",
      [newScore, JSON.stringify(badges), userId],
      err2 => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ score: newScore, badges });
      }
    );
  });
});

// 🧠 Secure quiz endpoint
app.post("/quiz", (req, res) => {
  const { userId, country, answer } = req.body;

  if (!userId || !country || !answer) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  // Vérifie que l'utilisateur existe
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur interne" });
    }

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié ou inexistant" });
    }

    const correctAnswers = {
      France: "Paris",
      Germany: "Berlin",
      Brazil: "Brasilia",
      Japan: "Tokyo",
      Canada: "Ottawa",
      Italy: "Rome",
      Egypt: "Cairo",
    };

    const isCorrect =
      correctAnswers[country] &&
      correctAnswers[country].toLowerCase() === answer.toLowerCase();

    if (!isCorrect) {
      return res.json({ correct: false });
    }

    const newScore = user.score + 1;
    let badges = JSON.parse(user.badges || "[]");

    if (!badges.includes(country)) {
      badges.push(country);
    }

    db.run(
      "UPDATE users SET score = ?, badges = ? WHERE id = ?",
      [newScore, JSON.stringify(badges), userId],
      (err2) => {
        if (err2) {
          return res.status(500).json({ error: "Erreur mise à jour score" });
        }

        res.json({ correct: true, newScore, newBadges: badges });
      }
    );
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend en écoute sur http://localhost:${PORT}`);
});