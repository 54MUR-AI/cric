const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const app = express()
const PORT = 3001
const STORAGE_DIR = '/data/cric-photos'
const API_KEY = process.env.CRIC_PHOTOS_API_KEY

function requireApiKey(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

app.use(require('cors')())
app.use(express.json())

app.post('/upload', requireApiKey, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' })
  }
  res.json({
    storage_path: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  })
})

app.use('/photos', express.static(STORAGE_DIR, { maxAge: '1y' }))

app.delete('/photos/:filename', requireApiKey, (req, res) => {
  const filename = path.basename(req.params.filename)
  const filePath = path.join(STORAGE_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' })
  }
  fs.unlinkSync(filePath)
  res.json({ success: true })
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, '127.0.0.1', () => {
  console.log(`CRIC Photo Server running on 127.0.0.1:${PORT}, storage: ${STORAGE_DIR}`)
})
