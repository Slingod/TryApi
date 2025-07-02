const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../monde_savoir.db'), (err) => {
  if (err) console.error('Erreur de connexion à SQLite:', err.message);
  else console.log('✅ Connecté à la base de données SQLite');
});

// Création de la table utilisateurs
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      score INTEGER DEFAULT 0,
      badges TEXT DEFAULT '[]'
    )
  `);
});

module.exports = db;
