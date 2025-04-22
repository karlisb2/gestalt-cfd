const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('./db/users.db', (err) => {
  if (err) {
    console.error(err.message)
  } else {
    console.log('Connected to SQLite database.')

    // ensure foreign keys work properly so cascade deletion can successfully be executed
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.error('Could not enable foreign keys:', err.message);
    });
    db.run( // USERS
      `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      psw_changed DATETIME NOT NULL,
      login_attempts INTEGER NOT NULL DEFAULT 0,
      time_since_last_attempt DATETIME);`
    )
    db.run( // LOGS
      `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);`
    )
    db.run( // EMAILS
      `CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      subject TEXT DEFAULT '',
      body TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      read BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);`
    )
    db.run( // PLANNER
      `CREATE TABLE IF NOT EXISTS planner (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);`
    )
    db.run( // SETTINGS
      `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      theme TEXT NOT NULL DEFAULT 'dark',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);`
    )
  }
})

module.exports = db
