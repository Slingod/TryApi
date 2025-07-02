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
const dbFile = path.join(__dirname, "quiz.db");
const db = new sqlite3.Database(dbFile);

// Si tu as déjà une table users sans colonnes catégories, ouvre
// un shell sqlite avant de lancer le serveur et exécute ces 4 lignes :
//
//   ALTER TABLE users ADD COLUMN capitalScore INTEGER DEFAULT 0;
//   ALTER TABLE users ADD COLUMN flagsScore   INTEGER DEFAULT 0;
//   ALTER TABLE users ADD COLUMN populationScore INTEGER DEFAULT 0;
//   ALTER TABLE users ADD COLUMN areaScore    INTEGER DEFAULT 0;
//
// Tu n'auras à le faire **qu'une seule fois**.  
// Ensuite, laisse le code ci‑dessous gérer normalement ta table.

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      score INTEGER DEFAULT 0,
      badges TEXT DEFAULT '[]',
      capitalScore   INTEGER DEFAULT 0,
      flagsScore     INTEGER DEFAULT 0,
      populationScore INTEGER DEFAULT 0,
      areaScore      INTEGER DEFAULT 0
    )
  `);
});

// Root handler
app.get("/", (req, res) => {
  res.send("🛠️ Backend Monde Savoir en service sur /");
});

// ➕ Create user
app.post("/users", (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Nom requis" });
  }
  db.run(
    `INSERT INTO users (username) VALUES (?)`,
    [username.trim()],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        username: username.trim(),
        score: 0,
        badges: [],
        capitalScore: 0,
        flagsScore: 0,
        populationScore: 0,
        areaScore: 0,
      });
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
  const uid = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [uid], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  });
});

// 🏅 Update global score + badges + category score
app.post("/users/:id/score", (req, res) => {
  const uid = req.params.id;
  const { delta, category } = req.body;

  if (typeof delta !== "number") {
    return res.status(400).json({ error: "Delta must be a number" });
  }

  db.get("SELECT * FROM users WHERE id = ?", [uid], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 1) Score global
    const newScore = user.score + delta;

    // 2) Badges globaux
    let badges = JSON.parse(user.badges || "[]");
    const badgeList = [
      { score: 10, name: "Novice" },
      { score: 25, name: "Apprenti" },
      { score: 50, name: "Connaisseur" },
      { score: 100, name: "Expert" },
      { score: 250, name: "Incollable" },
      { score: 1000, name: "Omniscient" },
    ];
    badgeList.forEach((b) => {
      if (newScore >= b.score && !badges.includes(b.name)) {
        badges.push(b.name);
      }
    });

    // 3) Score par catégorie
    const catCols = {
      capital: "capitalScore",
      flag: "flagsScore",
      population: "populationScore",
      area: "areaScore",
    };
    const catCol = category && catCols[category] ? catCols[category] : null;
    const newCatScore = catCol ? user[catCol] + delta : user[catCol];

    // Construction de la requête UPDATE dynamique
    const updates = [`"score" = ?`, `"badges" = ?`];
    const params = [newScore, JSON.stringify(badges)];

    if (catCol) {
      updates.push(`"${catCol}" = ?`);
      params.push(newCatScore);
    }

    params.push(uid);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      // Réponse avec les nouveaux scores
      const response = {
        score: newScore,
        badges,
      };
      if (catCol) response[catCol] = newCatScore;
      res.json(response);
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend en écoute sur http://localhost:${PORT}`);
});