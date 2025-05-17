import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import basicAuth from 'express-basic-auth'
import mime from 'mime-types'
import { config } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Constants
const PORT = process.env.PORT || 4500
const STORAGE_DIR = process.env.STORAGE_DIR || config.storageDir || path.join(__dirname, 'storage')
const USERNAME = process.env.AUTH_USERNAME || config.username
const PASSWORD = process.env.AUTH_PASSWORD || config.password

// Create Express app
const app = express()

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// Basic authentication middleware
const requireAuth = basicAuth({
    users: { [USERNAME]: PASSWORD },
    challenge: true,
    unauthorizedResponse: 'Authentication required'
})

// Process raw body first (important for binary data)
const rawBodyMiddleware = express.raw({
    type: () => true,
    limit: '50mb'
})


// Shutdown endpoint: requires basic auth, uses rawBodyMiddleware, does not affect other routes
app.post('/shutdown', requireAuth, rawBodyMiddleware, (req, res) => {
    console.log('Received shutdown request with body:', req.body.toString());
    if (req.body.toString() === 'STOP WEBSTORE') {
        res.status(200).send('Server is shutting down...');
        setTimeout(() => {
            process.exit(0);
        }, 1000); // Give time for response to be sent
    } else {
        res.status(400).send('Invalid shutdown command');
    }
});



// PUT - Create or update a file
app.put('/:filepath(*)', requireAuth, rawBodyMiddleware, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

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

// GET - Retrieve a file
app.get('/:filepath(*)', (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    if (!fs.existsSync(fullPath)) {
        return res.status(404).send('File not found')
    }

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
app.post('/:filepath(*)', requireAuth, rawBodyMiddleware, (req, res) => {
    console.log('POST request received for:', req.params.filepath);
    console.log('Request body:', req.body);

    const filepath = req.params.filepath
    const fullPath = path.join(STORAGE_DIR, filepath)

    if (fs.existsSync(fullPath)) {
        console.log('File already exists:', fullPath);
        return res.status(409).send('File already exists')
    }

    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
        console.log('Creating directory:', dir);
        fs.mkdirSync(dir, { recursive: true })
    }

    try {
        console.log('Writing to file:', fullPath);
        let content;
        if (Buffer.isBuffer(req.body)) {
            content = req.body;
        } else if (typeof req.body === 'string') {
            content = req.body;
        } else {
            content = req.body.toString();
        }
        fs.writeFileSync(fullPath, content)
        console.log('File written successfully');
        res.status(201).send('File created')
    } catch (err) {
        console.error('Error writing file:', err);
        res.status(500).send(`Error creating file: ${err.message}`)
    }
})

// PUT - Create or update a file
app.put('/:filepath(*)', requireAuth, rawBodyMiddleware, (req, res) => {
    console.log('PUT request received for:', req.params.filepath);
    console.log('Request body:', req.body);
    console.log('Type of req.body:', typeof req.body, 'Is Buffer:', Buffer.isBuffer(req.body));
    console.log('Request headers:', req.headers);

    const filepath = req.params.filepath;
    const fullPath = path.join(STORAGE_DIR, filepath);
    const dir = path.dirname(fullPath);
    console.log('Full path:', fullPath, 'Dir:', dir);

    if (!fs.existsSync(dir)) {
        console.log('Creating directory:', dir);
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        let content;
        if (Buffer.isBuffer(req.body)) {
            content = req.body;
            console.log('Writing buffer of length:', content.length);
        } else if (typeof req.body === 'string') {
            content = req.body;
            console.log('Writing string of length:', content.length);
        } else {
            content = req.body ? req.body.toString() : '';
            console.log('Writing coerced string of length:', content.length);
        }

        if (!content || content.length === 0) {
            console.error('No content to write!');
            return res.status(400).send('No content to write');
        }

        fs.writeFileSync(fullPath, content);
        console.log('File written successfully');
        res.status(200).send('File updated');
    } catch (err) {
        console.error('Error updating file:', err.message, err.stack);
        res.status(500).send(`Error updating file: ${err.message}\n${err.stack}`);
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

// Start the server when not in test mode
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`WebStore server running on port ${PORT}`)
        console.log(`Storage directory: ${STORAGE_DIR}`)
    })
}

// Export the app for testing
export default app