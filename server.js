require('dotenv').config()

const express = require('express')
const layouts = require('express-ejs-layouts')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const session = require('express-session')
const flash = require('connect-flash')
const axios = require('axios')

const path = require('path')
const app = express()

// INTERNAL
const attachUser = require('./middleware/attachUser')
const smtpServer = require('./serverSMTP')
const emailRoutes = require('./routes/emailRoutes')
const authRoutes = require('./routes/auth')
const pageRoutes = require('./routes/pages')

const PORT = process.env.PORT || 3000
const SMTP = process.env.SMTP || 2525

// MIDDLEWARES
app.use(session({
  secret: process.env.SESSION_SECRET || 'c935678e9cb0758de70d431f2fe5d644d6c940cfbdf5536a1cd97d618af601dc6f9f7bb1392e9d426cc3e22d9d6cdd987b38605532471cc5001a367941b0d763',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600000
  }
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(flash())
app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  next()
})
app.use(cors())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(layouts)

app.use(attachUser)

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.set('layout', './layouts/layout.ejs')
app.set('layout extractScripts', true)

// USE ROUTES
app.use('/', pageRoutes)
app.use('/', authRoutes)
app.use("/api/email", emailRoutes)

// ERR 404
app.use((req, res) => {
  res.status(404).render('404', { title: '404 Not Found' })
})

// SERVER START
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})

smtpServer.listen(SMTP, () => {
  console.log(`SMTP server running on port ${SMTP}`)
})
