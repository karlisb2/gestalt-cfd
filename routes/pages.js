const express = require('express')
const { promisify } = require('util')
const session = require('express-session')
const axios = require('axios')

// INTERNAL
const { authenticateToken } = require('../middleware/auth')
const db = require('../serverDB')
const dbGet = promisify(db.get).bind(db)
const dbRun = promisify(db.run).bind(db)
const dbAll = promisify(db.all).bind(db)
const emailModel = require('../models/emailModel')
const router = express.Router()

async function getGeoInfo(ip) {
  try {
    // Create an .env file with your API token from ipinfo.io set as TOKEN_IPINFO
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${process.env.TOKEN_IPINFO}`)
    const response = {}
    return response.data // Contains fields like city, region, country, etc.
  } catch (err) {
    console.error(`Failed to get geo info for IP ${ip}:`, err)
    return null
  }
}

// THEME
router.post('/save-theme', async (req, res) => {
  const { theme } = req.body
  const userId = req.session.userId

  if (userId) {
    const existingRecord = await dbGet('SELECT * FROM settings WHERE user_id = ?', [userId])

    if (existingRecord) {
      await dbRun('UPDATE settings SET theme = ? WHERE user_id = ?', [theme, userId])
    } else {
      await dbRun('INSERT INTO settings (user_id, theme) VALUES (?, ?)', [userId, theme])
    }

    req.session.theme = theme
    return res.status(200).json({ message: 'Theme saved successfully' })
  } else {
    // Save theme in a cookie for guests (30-day expiration)
    res.cookie('theme', theme, { maxAge: 1000 * 60 * 60 * 24 * 30 })
    return res.status(200).json({ message: 'Theme saved successfully' })
  }
})


// THEME MIDDLEWARE
router.use(async (req, res, next) => {
  if (req.session.userId) {
    // Get theme from database
    const user = await dbGet('SELECT theme FROM settings WHERE user_id = ?', [req.session.userId])
    req.session.theme = user?.theme || 'dark'
    res.locals.theme = req.session.theme
  } else {
    // Get theme from cookies for guests
    res.locals.theme = req.cookies.theme || 'dark'
  }
  next()
})


// ROUTES
router.get('/', (req, res) => {
  res.render('home', { title: 'Home', theme: res.locals.theme })
})

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', theme: res.locals.theme })
})

router.get('/register', (req, res) => {
  res.render('register', { title: 'Register', theme: res.locals.theme })
})

// MAIL
router.get('/mail', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.session.userId
    const view = req.query.view || 'all'

    const emails = await emailModel.findForUser(userId)

    res.render('email', {
      title: 'Mail',
      user: req.user,
      theme: res.locals.theme,
      emails,
      view
    })
  } catch (err) {
    next(err)
  }
})

// Render mail by ID
router.get("/mail/:id", authenticateToken, async (req, res) => {
  const emailId = req.params.id // Get the email ID from the URL
  const userId = req.session.userId  // Assuming userId is in the session

  try {
    // Find the email by its ID
    const email = await emailModel.findById(emailId)


    if (!email || email.user_id !== userId) {
      return res.status(404).send("Email not found")
    }


    // Mark the email as read
    await emailModel.markRead(emailId)

    // Render the email content
    res.render("emailDetail", { email, title: 'Mail' })
  } catch (error) {
    console.error("Error fetching email:", error)
    res.status(500).send("Internal Server Error")
  }
})

router.get('/planner', authenticateToken, (req, res) => {
  res.render('planner', { title: 'Planner', theme: res.locals.theme })
})

router.get('/logout', authenticateToken, (req, res) => {
  res.clearCookie('token')
  req.flash('success', 'Logged out successfully')
  res.redirect('/login')
})

router.get('/account', authenticateToken, async (req, res) => {
  const userId = req.session.userId
  try {
    const logs = await dbAll('SELECT * FROM logs WHERE user_id = ? ORDER BY timestamp DESC', [userId])

    // Enrich each log with geolocation data
    const logsWithGeo = await Promise.all(logs.map(async (log) => {
      const geoInfo = await getGeoInfo(log.ip_address)
      return { ...log, geoInfo }
    }))

    res.render('account', { title: 'Account', theme: res.locals.theme, logs: logsWithGeo })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).send('Internal Server Error')
  }
})

router.get('/changePassword', authenticateToken, (req, res) => {
  res.render('changePassword', { title: 'Change Password', theme: res.locals.theme })
})

router.get('/deleteaccount', authenticateToken, (req, res) => {
  res.render('deleteAccount', {
    title: 'Confirm Account Deletion',
    theme: res.locals.theme,
    user: req.user
  });
});

// POST actual deletion
router.post('/deleteaccount', authenticateToken, async (req, res) => {
  const userId = req.session.userId;
  const confirmation = req.body.confirmation;

  if (confirmation !== 'CONFIRM') {
    req.flash('error', 'You must type CONFIRM to delete your account.');
    return res.redirect('/deleteaccount');
  }

  try {
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    req.flash('success', 'Your account has been deleted.');

    req.session.destroy(err => {
      res.clearCookie('token');
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.redirect('/');
    });

  } catch (err) {
    console.error('Error deleting account:', err);
    req.flash('error', 'Internal Server Error. Account not deleted.');
    res.redirect('/account');
  }
});

// EXPORT
module.exports = router
