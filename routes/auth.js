const express = require('express')
const { promisify } = require('util')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// INTERNAL
const db = require('../serverDB')

const dbAll = promisify(db.all).bind(db)
const dbGet = promisify(db.get).bind(db)
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                return reject(err)
            }
            resolve({ lastID: this.lastID, changes: this.changes })
        })
    })
}


function getCurrentDate() {
    const date = new Date()
    return date.toISOString().split('T')[0]
}

const router = express.Router()

// CONSTANTS
const SECRET_KEY = process.env.JWT_SECRET || '0d67b9077b2dab687e3c3b746370dbff4c7bbf1dae6bdad9417ca114792670e662e21275cc5ca30e7328e79a1b87e3ee8da502f79dcd0607db82e499d0b3d9ef'

const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes
const ATTEMPT_RESET_DURATION = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS = 3

// REGISTER
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body

    if (!username || !password || !email) {
        req.flash('error', 'Username, email, and password are required')
        return res.redirect('/register')
    }

    try {
        const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [username])

        if (existingUser) {
            req.flash('error', 'User already exists')
            return res.redirect('/register')
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        const currentDatetime = new Date().toISOString()

        await dbRun(
            'INSERT INTO users (username, password, email, psw_changed) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, currentDatetime]
        )

        req.flash('success', 'Successfully registered')
        console.log(`${username} has been registered.`)
        res.redirect('/login')

    } catch (error) {
        console.error('Database error:', error)
        req.flash('error', 'Internal Server Error')
        res.redirect('/register')
    }
})

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body
    const ip = req.ip // Capture the client's IP address

    try {
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username])
        const now = new Date()
        // Log and handle the case when user is not found.
        if (!user) {
            // Log the failed login attempt (user not found)
            await dbRun(
                'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
                [null, 'login failed: user not found', ip]
            )
            req.flash('error', 'Invalid credentials')
            return res.redirect('/login')
        }

        const lastAttemptTime = user.time_since_last_attempt ? new Date(user.time_since_last_attempt) : null
        const isLockedOut = lastAttemptTime && user.login_attempts >= MAX_ATTEMPTS && now - lastAttemptTime < LOCKOUT_DURATION

        if (lastAttemptTime && now - lastAttemptTime >= ATTEMPT_RESET_DURATION) {
            await dbRun('UPDATE users SET login_attempts = 0 WHERE id = ?', [user.id])
            user.login_attempts = 0
        }

        if (isLockedOut) {
            // Log locked out attempt
            await dbRun(
                'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
                [user.id, 'login failed: locked out', ip]
            )
            req.flash('error', 'Too many failed attempts. Try again in 30 minutes.')
            return res.redirect('/login')
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            // Log failed login attempt due to incorrect password
            await dbRun(
                'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
                [user.id, 'login failed: incorrect password', ip]
            )

            await dbRun(
                'UPDATE users SET login_attempts = ?, time_since_last_attempt = ? WHERE id = ?',
                [user.login_attempts + 1, now.toISOString(), user.id]
            )

            req.flash('error', 'Invalid credentials')
            return res.redirect('/login')
        }

        // Log the successful login
        await dbRun(
            'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
            [user.id, 'login success', ip]
        )

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hour
        })

        req.session.username = user.username
        req.session.userId = user.id

        res.redirect('/')
    } catch (error) {
        console.error('Database error:', error)
        req.flash('error', 'Internal Server Error')
        res.redirect('/login')
    }
})


// CHANGE PASSWORD
router.post('/changepassword', async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const ip = req.ip // Capture the client's IP address

    try {
        const username = req.user?.username || req.session?.username
        if (!username) {
            req.flash('error', 'User not authenticated')
            return res.redirect('/login')
        }

        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username])

        if (!user) {
            req.flash('error', 'User not found')
            return res.redirect('/changepassword')
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            req.flash('error', 'Incorrect current password')
            return res.redirect('/changepassword')

            await dbRun( // log unsuccessful password change
                'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
                [user.id, 'change password: failure', ip]
            )
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            req.flash('error', 'New password must be different from the old one')
            return res.redirect('/changepassword')
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        const currentDatetime = new Date().toISOString()

        console.log('Updating password for:', username)
        const updateResult = await dbRun(
            'UPDATE users SET password = ?, psw_changed = ? WHERE username = ?',
            [hashedPassword, currentDatetime, username]
        )

        await dbRun( // log password change
            'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
            [user.id, 'change password: success', ip]
        )

        req.flash('success', 'Password changed successfully')
        return res.redirect('/account')

    } catch (error) {
        console.error('Database error:', error)
        req.flash('error', 'Internal Server Error')
        return res.redirect('/changepassword')
    }
})


// PLANNER

// GET tasks for the current date for the logged-in user
router.get('/api/tasks', async (req, res) => {
    try {
        const userId = req.session.userId
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' })
        }
        const tasks = await dbAll('SELECT * FROM planner WHERE user_id = ? AND date = ?', [userId, getCurrentDate()])
        res.json(tasks)
    } catch (error) {
        console.error('Error fetching tasks:', error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})

// POST a new task for the current date
router.post('/api/tasks', async (req, res) => {
    const { time, title, description } = req.body
    const userId = req.session.userId

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
    }
    if (!time || !title) {
        return res.status(400).json({ message: 'Time and title are required.' })
    }

    try {
        const currentDate = getCurrentDate()
        // Using dbRun which returns an object with lastID
        const result = await dbRun(
            'INSERT INTO planner (user_id, date, time, title, description) VALUES (?, ?, ?, ?, ?)',
            [userId, currentDate, time, title, description]
        )
        const newTask = {
            id: result.lastID, // Last inserted ID from SQLite
            user_id: userId,
            date: currentDate,
            time,
            title,
            description,
        }

        res.status(201).json(newTask)
    } catch (error) {
        console.error('Error adding task:', error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})

router.delete('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id

    try {
        const taskCheck = await dbGet('SELECT * FROM planner WHERE id = ?', [taskId])
        if (!taskCheck) {
            return res.status(404).json({ message: 'Task not found.' })
        }

        await dbRun('DELETE FROM planner WHERE id = ?', [taskId])
        res.status(200).json({ message: 'Task deleted successfully' })
    } catch (error) {
        console.error('Error deleting task:', error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})



// EXPORT
module.exports = router
