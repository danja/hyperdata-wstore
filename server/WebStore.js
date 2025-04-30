// WebStore.js - HTTP server for file storage using Express
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import basicAuth from 'express-basic-auth'
import mime from 'mime-types'
import { config } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4500
const STORAGE_DIR = config.storageDir || path.join(__dirname, 'storage')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// Basic authentication middleware for PUT, POST and DELETE
const requireAuth = basicAuth({
    users: { [config.username]: config.password },
    challenge: true,
    unauthorizedResponse: 'Authentication required'
})

// Parse JSON body
app.use(express.json())

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }))

// Parse raw body for PUT and POST requests
app.use(express.raw({
    type: '*/*',
    limit: '50mb'
}))

// GET - Retrieve a file
app.get('/:filepath(*)', (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    if (!fs.existsSync(fullPath)) {
        return res.status(404).send('File not found')
    }

    // Check if file or directory
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
        fs.readdir(fullPath, (err, files) => {
            if (err) {
                return res.status(500).send('Error reading directory')
            }
            res.json({ files })
        })
    } else {
        // Set content type based on file extension
        const contentType = mime.lookup(fullPath) || 'application/octet-stream'
        res.setHeader('Content-Type', contentType)

        // Stream the file
        const fileStream = fs.createReadStream(fullPath)
        fileStream.pipe(res)
    }
})

// POST - Create a new file (fails if file exists)
app.post('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
        return res.status(409).send('File already exists')
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    try {
        fs.writeFileSync(fullPath, req.body)
        res.status(201).send('File created')
    } catch (err) {
        res.status(500).send(`Error creating file: ${err.message}`)
    }
})

// PUT - Create or update a file
app.put('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    // Ensure directory exists
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    try {
        fs.writeFileSync(fullPath, req.body)
        res.send('File updated')
    } catch (err) {
        res.status(500).send(`Error updating file: ${err.message}`)
    }
})

// DELETE - Remove a file
app.delete('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    if (!fs.existsSync(fullPath)) {
        return res.status(404).send('File not found')
    }

    try {
        fs.unlinkSync(fullPath)
        res.send('File deleted')
    } catch (err) {
        res.status(500).send(`Error deleting file: ${err.message}`)
    }
})

app.listen(PORT, () => {
    console.log(`WebStore server running on port ${PORT}`)
})