import fs from 'fs'
import path from 'path'
import request from 'supertest'
import { fileURLToPath } from 'url'
import express from 'express'
import basicAuth from 'express-basic-auth'

import {
  createTestStorageDir,
  removeTestStorageDir,
  createTestFile,
  fileExists,
  readTestFile
} from './helpers/test-helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_STORAGE_DIR = path.join(__dirname, 'test-storage')

// Create app for integration testing
function createIntegrationApp() {
  const app = express()
  const config = {
    storageDir: TEST_STORAGE_DIR,
    username: 'testuser',
    password: 'testpass'
  }

  // Apply middleware and routes similar to WebStore.js
  app.use(express.raw({
    type: '*/*',
    limit: '50mb'
  }))

  // These parsers will only be used after the raw parser
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Authentication middleware
  const requireAuth = basicAuth({
    users: { [config.username]: config.password },
    challenge: true,
    unauthorizedResponse: 'Authentication required'
  })

  // GET route
  app.get('/:filepath(*)', (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(config.storageDir, filepath)

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
      const fileStream = fs.createReadStream(fullPath)
      fileStream.pipe(res)
    }
  })

  // POST route
  app.post('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(config.storageDir, filepath)

    if (fs.existsSync(fullPath)) {
      return res.status(409).send('File already exists')
    }

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

  // PUT route
  app.put('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(config.storageDir, filepath)

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

  // DELETE route
  app.delete('/:filepath(*)', requireAuth, (req, res) => {
    const filepath = req.params.filepath
    const fullPath = path.join(config.storageDir, filepath)

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

  return app
}

describe('WebStore Integration Tests', () => {
  let app

  beforeAll(() => {
    // Remove any existing test directory to start fresh
    removeTestStorageDir()
    // Create test storage directory
    createTestStorageDir()
  })

  afterAll(() => {
    // Remove test storage directory
    removeTestStorageDir()
  })

  beforeEach(() => {
    // Create app
    app = createIntegrationApp()

    // Create fresh test files for each test
    createTestFile('existing-file.txt', 'This is an existing file for testing')
    createTestFile('directory/nested-file.txt', 'This is a nested file')
  })

  afterEach(() => {
    // Clean up files created during tests while keeping the base structure
    try {
      // Keep only initial test files, remove everything else
      const files = fs.readdirSync(TEST_STORAGE_DIR)
      for (const file of files) {
        if (file !== 'existing-file.txt' && file !== 'directory') {
          const filePath = path.join(TEST_STORAGE_DIR, file)
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true })
          } else {
            fs.unlinkSync(filePath)
          }
        }
      }

      // Reset existing-file.txt to original content
      createTestFile('existing-file.txt', 'This is an existing file for testing')
    } catch (err) {
      console.error('Error in afterEach cleanup:', err)
    }
  })

  describe('Server Operations', () => {
    it('should retrieve an existing file', async () => {
      const response = await request(app)
        .get('/existing-file.txt')
        .expect(200)

      expect(response.text).toEqual('This is an existing file for testing')
    })

    it('should retrieve a directory listing', async () => {
      const response = await request(app)
        .get('/directory')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toEqual({ files: ['nested-file.txt'] })
    })

    it('should return 404 for non-existent files', async () => {
      await request(app)
        .get('/non-existent.txt')
        .expect(404)
    })

    it('should require authentication for POST operations', async () => {
      await request(app)
        .post('/new-file.txt')
        .send('New file content')
        .expect(401)
    })

    it('should create a new file with POST', async () => {
      // Ensure file doesn't exist first
      const filePath = path.join(TEST_STORAGE_DIR, 'new-file.txt')
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      await request(app)
        .post('/new-file.txt')
        .auth('testuser', 'testpass')
        .send('New file content')
        .expect(201)

      expect(fileExists('new-file.txt')).toEqual(true)
      expect(readTestFile('new-file.txt')).toEqual('New file content')
    })

    it('should return 409 when POSTing to an existing file', async () => {
      await request(app)
        .post('/existing-file.txt')
        .auth('testuser', 'testpass')
        .send('Updated content')
        .expect(409)
    })

    it('should require authentication for PUT operations', async () => {
      await request(app)
        .put('/existing-file.txt')
        .send('Updated content')
        .expect(401)
    })

    it('should update an existing file with PUT', async () => {
      await request(app)
        .put('/existing-file.txt')
        .auth('testuser', 'testpass')
        .send('Updated content')
        .expect(200)

      expect(readTestFile('existing-file.txt')).toEqual('Updated content')
    })

    it('should create a new file with PUT if it does not exist', async () => {
      const filePath = path.join(TEST_STORAGE_DIR, 'new-file-via-put.txt')
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      await request(app)
        .put('/new-file-via-put.txt')
        .auth('testuser', 'testpass')
        .send('New file via PUT')
        .expect(200)

      expect(fileExists('new-file-via-put.txt')).toEqual(true)
      expect(readTestFile('new-file-via-put.txt')).toEqual('New file via PUT')
    })

    it('should require authentication for DELETE operations', async () => {
      await request(app)
        .delete('/existing-file.txt')
        .expect(401)
    })

    it('should delete an existing file', async () => {
      // Create a file specifically for deletion
      createTestFile('file-to-delete.txt', 'This file will be deleted')
      expect(fileExists('file-to-delete.txt')).toEqual(true)

      await request(app)
        .delete('/file-to-delete.txt')
        .auth('testuser', 'testpass')
        .expect(200)

      expect(fileExists('file-to-delete.txt')).toEqual(false)
    })

    it('should return 404 when deleting a non-existent file', async () => {
      await request(app)
        .delete('/non-existent.txt')
        .auth('testuser', 'testpass')
        .expect(404)
    })

    it('should handle file operations in nested directories', async () => {
      // Create a nested file
      await request(app)
        .put('/nested/path/file.txt')
        .auth('testuser', 'testpass')
        .send('Nested file content')
        .expect(200)

      expect(fileExists('nested/path/file.txt')).toEqual(true)

      // Retrieve the nested file
      const response = await request(app)
        .get('/nested/path/file.txt')
        .expect(200)

      expect(response.text).toEqual('Nested file content')

      // Delete the nested file
      await request(app)
        .delete('/nested/path/file.txt')
        .auth('testuser', 'testpass')
        .expect(200)

      expect(fileExists('nested/path/file.txt')).toEqual(false)
    })

    it('should handle binary files', async () => {
      // Create a buffer of binary data
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) // PNG file signature

      // Clean up any previous binary file
      const binaryPath = path.join(TEST_STORAGE_DIR, 'binary-file.bin')
      if (fs.existsSync(binaryPath)) {
        fs.unlinkSync(binaryPath)
      }

      // Upload binary file
      await request(app)
        .put('/binary-file.bin')
        .auth('testuser', 'testpass')
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        .expect(200)

      expect(fileExists('binary-file.bin')).toEqual(true)

      // Verify the binary content with raw buffer comparison
      const storedFile = fs.readFileSync(binaryPath)
      expect(Buffer.isBuffer(storedFile)).toEqual(true)
      expect(storedFile.length).toEqual(binaryData.length)

      // Compare buffers byte by byte
      for (let i = 0; i < binaryData.length; i++) {
        expect(storedFile[i]).toEqual(binaryData[i])
      }
    })
  })
})