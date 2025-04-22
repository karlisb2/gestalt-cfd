const nodemailer = require('nodemailer')

const SMTPServer = require("smtp-server").SMTPServer
const fs = require('fs')

const server = new SMTPServer({
    secure: process.env.NODE_ENV === 'production',
    key: fs.readFileSync("./smtp-cert/private.key"),
    cert: fs.readFileSync("./smtp-cert/server.crt"),
})

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || `http://localhost:2525`,
  port: +process.env.SMTP_PORT || 2525,
  secure: process.env.NODE_ENV === 'production',
  auth: {
    user: process.env.SMTP_USER || "admin@gestalt.cfd",
    pass: process.env.SMTP_PASS || "password"
  },
  tls: {
    rejectUnauthorized: false,
  },
})

async function sendMail({ from, to, subject, text }) {
  return transporter.sendMail({ from, to, subject, text })
}

module.exports = { sendMail }
module.exports = server
