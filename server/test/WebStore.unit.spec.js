import express from 'express'
import fs from 'fs'
import path from 'path'
import request from 'supertest'
import basicAuth from 'express-basic-auth'
import { fileURLToPath } from 'url'

import {
  setupMockFileSystem,
  cleanupMockFileSystem,
  getTestConfig
} from './helpers/test-helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get test configuration
const mockConfig = getTestConfig()

describe('WebStore Unit Tests', () => {
  let app

  // Before all tests, set up the mock file system
  beforeAll(() => {
    setupMockFileSystem()
  })

  // After all tests, clean up the mock file system
  afterAll(() => {
    cleanupMockFileSystem()
  })

  // Create a new app instance before each test
  beforeEach(() => {
    app = express()

    // Apply middleware and routes similar to WebStore.js
    app.use(express.raw({
      type: '*/*',
      limit: '50mb'
    }))

    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Mock authentication middleware
    const requireAuth = basicAuth({
      users: { [mockConfig.username]: mockConfig.password },
      challenge: true,
      unauthorizedResponse: 'Authentication required'
    })

    // GET route
    app.get('/:filepath(*)', (req, res) => {
      const filepath = req.params.filepath
      const fullPath = path.join(mockConfig.storageDir, filepath)

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
      const fullPath = path.join(mockConfig.storageDir, filepath)

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
      const fullPath = path.join(mockConfig.storageDir, filepath)

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
      const fullPath = path.join(mockConfig.storageDir, filepath)

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
  })

  describe('GET /:filepath', () => {
    it('should return 404 when file does not exist', async () => {
      const response = await request(app)
        .get('/non-existent-file.txt')
        .expect(404)

      expect(response.text).toEqual('File not found')
    })

    it('should return file content when file exists', async () => {
      // Verify the file exists in the mock filesystem
      expect(fs.existsSync(path.join(mockConfig.storageDir, 'existing-file.txt'))).toBe(true)

      const response = await request(app)
        .get('/existing-file.txt')
        .expect(200)

      expect(response.text).toEqual('This is an existing file for testing')
    })

    it('should return directory listing when path is a directory', async () => {
      // Verify the directory exists in the mock filesystem
      expect(fs.existsSync(path.join(mockConfig.storageDir, 'directory'))).toBe(true)
      expect(fs.statSync(path.join(mockConfig.storageDir, 'directory')).isDirectory()).toBe(true)

      const response = await request(app)
        .get('/directory')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toEqual({ files: ['nested-file.txt'] })
    })
  })

  describe('POST /:filepath', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/new-file.txt')
        .send('New file content')
        .expect(401)
    })

    it('should create a new file', async () => {
      // Verify the file doesn't exist before the test
      const newFilePath = path.join(mockConfig.storageDir, 'new-file.txt')
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath)
      }

      const response = await request(app)
        .post('/new-file.txt')
        .auth(mockConfig.username, mockConfig.password)
        .send('New file content')
        .expect(201)

      expect(response.text).toEqual('File created')

      // Verify file exists with correct content
      expect(fs.existsSync(newFilePath)).toBe(true)
      expect(fs.readFileSync(newFilePath, 'utf8')).toEqual('New file content')
    })

    it('should return 409 when file already exists', async () => {
      // Ensure the file exists
      const existingPath = path.join(mockConfig.storageDir, 'existing-file.txt')
      expect(fs.existsSync(existingPath)).toBe(true)

      const response = await request(app)
        .post('/existing-file.txt')
        .auth(mockConfig.username, mockConfig.password)
        .send('New content')
        .expect(409)

      expect(response.text).toEqual('File already exists')
    })

    it('should create parent directories if they do not exist', async () => {
      const nestedFilePath = path.join(mockConfig.storageDir, 'new-dir/new-subdir/file.txt')

      // Ensure directories and file don't exist before the test
      if (fs.existsSync(nestedFilePath)) {
        fs.unlinkSync(nestedFilePath)
      }

      const dirPath = path.dirname(nestedFilePath)
      if (fs.existsSync(dirPath)) {
        try {
          fs.rmdirSync(dirPath, { recursive: true })
        } catch (err) {
          console.error('Error removing directory:', err)
        }
      }

      const response = await request(app)
        .post('/new-dir/new-subdir/file.txt')
        .auth(mockConfig.username, mockConfig.password)
        .send('Nested file content')
        .expect(201)

      expect(response.text).toEqual('File created')

      // Verify file exists with correct content
      expect(fs.existsSync(nestedFilePath)).toBe(true)
      expect(fs.readFileSync(nestedFilePath, 'utf8')).toEqual('Nested file content')
    })
  })

  describe('PUT /:filepath', () => {
    it('should require authentication', async () => {
      await request(app)
        .put('/existing-file.txt')
        .send('Updated content')
        .expect(401)
    })

    it('should update an existing file', async () => {
      const response = await request(app)
        .put('/existing-file.txt')
        .auth(mockConfig.username, mockConfig.password)
        .send('Updated content')
        .expect(200)

      expect(response.text).toEqual('File updated')

      // Verify file exists with updated content
      expect(fs.readFileSync(path.join(mockConfig.storageDir, 'existing-file.txt'), 'utf8')).toEqual('Updated content')
    })

    it('should create a new file if it does not exist', async () => {
      const newPutFilePath = path.join(mockConfig.storageDir, 'new-file-via-put.txt')

      // Ensure the file doesn't exist before the test
      if (fs.existsSync(newPutFilePath)) {
        fs.unlinkSync(newPutFilePath)
      }

      const response = await request(app)
        .put('/new-file-via-put.txt')
        .auth(mockConfig.username, mockConfig.password)
        .send('New file via PUT')
        .expect(200)

      expect(response.text).toEqual('File updated')

      // Verify file exists with correct content
      expect(fs.existsSync(newPutFilePath)).toBe(true)
      expect(fs.readFileSync(newPutFilePath, 'utf8')).toEqual('New file via PUT')
    })
  })

  describe('DELETE /:filepath', () => {
    it('should require authentication', async () => {
      await request(app)
        .delete('/existing-file.txt')
        .expect(401)
    })

    it('should delete an existing file', async () => {
      // Create a file to delete if it doesn't exist
      const fileToDeletePath = path.join(mockConfig.storageDir, 'file-to-delete.txt')
      fs.writeFileSync(fileToDeletePath, 'This file will be deleted')

      const response = await request(app)
        .delete('/file-to-delete.txt')
        .auth(mockConfig.username, mockConfig.password)
        .expect(200)

      expect(response.text).toEqual('File deleted')

      // Verify file no longer exists
      expect(fs.existsSync(fileToDeletePath)).toBe(false)
    })

    it('should return 404 when file does not exist', async () => {
      const response = await request(app)
        .delete('/non-existent-file.txt')
        .auth(mockConfig.username, mockConfig.password)
        .expect(404)

      expect(response.text).toEqual('File not found')
    })
  })
})