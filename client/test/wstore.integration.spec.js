import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import nock from 'nock'

import {
  setupMockFileSystem,
  cleanupMockFileSystem,
  getTestFilePath,
  createTestFile,
  fileExists,
  readTestFile
} from './helpers/test-helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CLIENT_PATH = path.join(__dirname, '..', 'wstore.js')

describe('WStore Client Integration Tests', () => {
  const baseUrl = 'http://localhost:4500/'

  beforeEach(() => {
    // Set up mock file system
    setupMockFileSystem()

    // Create test files
    createTestFile('test-data.txt', 'Test data for upload')
    createTestFile('test-data.json', JSON.stringify({ test: 'data' }))

    // Spy on console methods
    spyOn(console, 'log')
    spyOn(console, 'error')
  })

  afterEach(() => {
    // Clean up after each test
    cleanupMockFileSystem()
    nock.cleanAll()
  })

  describe('Command Line Interface', () => {
    it('should execute GET command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command
      const outputPath = path.join(__dirname, 'test-output.txt')
      execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} get remote-file.txt ${outputPath}`, {
        stdio: 'pipe'
      })

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')

      // Clean up
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }
    })

    it('should execute POST command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .post('/remote-file.txt')
        .reply(201, 'File created')

      // Get local file path
      const localFilePath = getTestFilePath('test-data.txt')

      let error = null
      // Execute the command
      try {
        execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass post ${localFilePath} remote-file.txt`, {
          stdio: 'pipe'
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()
    })

    it('should execute PUT command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .put('/remote-file.txt')
        .reply(200, 'File updated')

      // Get local file path
      const localFilePath = getTestFilePath('test-data.txt')

      let error = null
      // Execute the command
      try {
        execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass put ${localFilePath} remote-file.txt`, {
          stdio: 'pipe'
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()
    })

    it('should execute DELETE command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .delete('/remote-file.txt')
        .reply(200, 'File deleted')

      let error = null
      // Execute the command
      try {
        execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass delete remote-file.txt`, {
          stdio: 'pipe'
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()
    })

    it('should handle environment variables for configuration', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command with environment variables
      const outputPath = path.join(__dirname, 'test-output.txt')
      const env = {
        ...process.env,
        WSTORE_BASEURL: baseUrl
      }

      let error = null
      try {
        execSync(`node ${CLIENT_PATH} get remote-file.txt ${outputPath}`, {
          stdio: 'pipe',
          env
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')

      // Clean up
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }
    })

    it('should include headers in output when --include flag is used', () => {
      // Mock the HTTP request with headers
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content', {
          'Content-Type': 'text/plain',
          'Content-Length': '19'
        })

      // Execute the command with -i flag
      let output
      let error = null
      try {
        output = execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} -i get remote-file.txt`, {
          stdio: 'pipe',
          encoding: 'utf8'
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify headers are included in output
      expect(output).toContain('HTTP Response Headers:')
      expect(output).toContain('content-type: text/plain')
      expect(output).toContain('Remote file content')
    })

    it('should save output to a file when -o option is used', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command with -o flag
      const outputPath = path.join(__dirname, 'custom-output.txt')
      let error = null
      try {
        execSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} get remote-file.txt -o ${outputPath}`, {
          stdio: 'pipe'
        })
      } catch (err) {
        error = err
      }

      // Verify no error occurred
      expect(error).toBeNull()

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')

      // Clean up
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }
    })
  })
})