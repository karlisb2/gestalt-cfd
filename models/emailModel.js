const db = require('../serverDB')
const { promisify } = require('util')
const dbAll = promisify(db.all).bind(db)
const dbGet = promisify(db.get).bind(db)
const dbRun = promisify(db.run).bind(db)

class emailModel {
  static findForUser(userId) {
    return dbAll(
      `SELECT id, from_address AS \`from\`, subject, body, timestamp, read
       FROM emails WHERE user_id = ? ORDER BY timestamp DESC`,
      [userId]
    )
  }

  static findById(id) {
    return dbGet(
      `SELECT id, user_id, from_address AS \`from\`, to_address AS \`to\`,
              subject, body, timestamp, read
       FROM emails WHERE id = ?`,
      [id]
    )
  }


  static send({ from, to, subject, body, userId }) {
    return dbRun(
      `INSERT INTO emails (user_id, from_address, to_address, subject, body)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, from, to, subject, body]
    )
  }

  static markRead(id) {
    return dbRun(`UPDATE emails SET read = 1 WHERE id = ?`, [id])
  }

  static delete(id) {
    return dbRun(`DELETE FROM emails WHERE id = ?`, [id])
  }
}

module.exports = emailModel
