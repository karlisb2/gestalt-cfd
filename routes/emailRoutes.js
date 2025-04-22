const express = require("express")
const smtpServer = require('../serverSMTP')
const router = express.Router()

// API route to send an email
router.post("/send", async (req, res) => {
    const { to, subject, message } = req.body
    const user = req.session

    if (!to || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" })
    }

    try {
        const mailOptions = {
            from: `${user}@gestalt.cfd`,
            to: to,
            subject: subject,
            text: message,
        }

        await transporter.sendMail(mailOptions)
        res.status(200).json({ success: "Email sent successfully!" })
    } catch (error) {
        console.error("Error sending email:", error)
        res.status(500).json({ error: "Failed to send email" })
    }
})

// EXPORT
module.exports = router
