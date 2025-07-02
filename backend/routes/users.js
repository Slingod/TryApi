const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 🔹 GET /users — Liste tous les utilisateurs
router.get('/', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🔹 POST /users — Crée un nouvel utilisateur
router.post('/', (req, res) => {
  const { username } = req.body;
  db.run(
    'INSERT INTO users (username) VALUES (?)',
    [username],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, username, score: 0, badges: [] });
    }
  );
});

// 🔹 PUT /users/:id/score — Met à jour le score d’un utilisateur
router.put('/:id/score', (req, res) => {
  const { score } = req.body;
  db.run(
    'UPDATE users SET score = ? WHERE id = ?',
    [score, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// 🔹 PUT /users/:id/badges — Met à jour les badges d’un utilisateur
router.put('/:id/badges', (req, res) => {
  const { badges } = req.body;
  db.run(
    'UPDATE users SET badges = ? WHERE id = ?',
    [JSON.stringify(badges), req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;
