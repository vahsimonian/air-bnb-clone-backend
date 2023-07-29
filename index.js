const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { default: mongoose } = require('mongoose')
// const mongoose = require('mongoose')
const User = require('./models/User')
const cookieParser = require('cookie-parser')
const imageDownloader = require('image-downloader')
const multer = require('multer')
const app = express()
const fs = require('fs')

const bcryptSalt = bcrypt.genSaltSync(10)
const jwtSecret = 'ib232IBh9nw1muI89jh7Hi9dn'

app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(
  cors({
    credentials: true,
    origin: 'http://localhost:5173',
  })
)

app.get('/test', (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  res.json('test ok')
})

app.post('/register', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  const { name, email, password } = req.body

  try {
    const UserDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    })
    res.json(UserDoc)
  } catch (e) {
    res.status(422).json(e)
  }
})

app.post('/login', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  const { email, password } = req.body
  const userDoc = await User.findOne({ email })
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password)
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err
          res.cookie('token', token).json(userDoc)
        }
      )
    } else {
      res.status(422).json('pass not ok')
    }
  } else {
    res.json('not found')
  }
})

app.get('/profile', (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  const { token } = req.cookies
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err
      const { name, email, _id } = await User.findById(userData.id)

      res.json({ name, email, _id })
    })
  } else {
    res.json(null)
  }
})

app.post('/logout', (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  res.cookie('token', '').json(true)
})

app.post('/upload-by-link', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  const { link } = req.body
  const newName = 'photo' + Date.now() + '.jpg'
  await imageDownloader.image({
    url: link,
    dest: __dirname + '/uploads/' + newName,
  })
  res.json(newName)
})

const photosMiddleware = multer({ dest: 'uploads/' })
mongoose.connect(process.env.MONGO_URL)
app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
  const uploadedFiles = []
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i]
    const parts = originalname.split('.')
    const ext = parts[parts.length - 1]
    const newPath = path + '.' + ext
    fs.renameSync(path, newPath)
    uploadedFiles.push(newPath.replace('uploads\\', ''))
  }
  res.json(uploadedFiles)
})

app.listen(4000)
