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
  readTestFile,
  createBinaryTestData
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
    createTestFile('test-binary.bin', createBinaryTestData(256))
  })

  afterEach(() => {
    // Clean up after each test
    cleanupMockFileSystem()
    nock.cleanAll()
  })

  // Helper function to safely execute commands
  function safeExecSync(command, options = {}) {
    try {
      return execSync(command, { stdio: 'pipe', encoding: 'utf8', ...options })
    } catch (error) {
      // Return error for test to inspect
      return {
        error: true,
        status: error.status,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        message: error.message
      }
    }
  }

  describe('Command Line Interface', () => {
    it('should execute GET command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command
      const outputPath = getTestFilePath('test-output.txt')
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} get remote-file.txt ${outputPath}`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')
    })

    it('should execute POST command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .post('/remote-file.txt')
        .reply(201, 'File created')

      // Get local file path
      const localFilePath = getTestFilePath('test-data.txt')

      // Execute the command
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass post ${localFilePath} remote-file.txt`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()

      // Verify output contains success message
      expect(result).toContain('created successfully')
    })

    it('should execute PUT command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .put('/remote-file.txt')
        .reply(200, 'File updated')

      // Get local file path
      const localFilePath = getTestFilePath('test-data.txt')

      // Execute the command
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass put ${localFilePath} remote-file.txt`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()

      // Verify output contains success message
      expect(result).toContain('updated successfully')
    })

    it('should execute DELETE command correctly', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .delete('/remote-file.txt')
        .reply(200, 'File deleted')

      // Execute the command
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass delete remote-file.txt`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify nock was called correctly
      expect(nock.isDone()).toBeTrue()

      // Verify output contains success message
      expect(result).toContain('deleted successfully')
    })

    it('should handle environment variables for configuration', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command with environment variables
      const outputPath = getTestFilePath('test-env-output.txt')
      const env = {
        ...process.env,
        WSTORE_BASEURL: baseUrl
      }

      const result = safeExecSync(`node ${CLIENT_PATH} get remote-file.txt ${outputPath}`, { env })

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')
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
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} -i get remote-file.txt`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify headers are included in output
      expect(result).toContain('HTTP Response Headers:')
      expect(result).toContain('content-type: text/plain')
      expect(result).toContain('Remote file content')
    })

    it('should save output to a file when -o option is used', () => {
      // Mock the HTTP request
      nock(baseUrl)
        .get('/remote-file.txt')
        .reply(200, 'Remote file content')

      // Execute the command with -o flag
      const outputPath = getTestFilePath('custom-output.txt')
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} get remote-file.txt -o ${outputPath}`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify file was created with correct content
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('Remote file content')
    })

    it('should handle binary files correctly', () => {
      // Create binary test data
      const binaryData = createBinaryTestData(256)
      const binaryPath = getTestFilePath('binary-test.bin')
      fs.writeFileSync(binaryPath, binaryData)

      // Mock the HTTP request to accept and return binary data
      nock(baseUrl)
        .put('/binary.bin')
        .reply(200, 'Binary file uploaded')

      // Execute the command
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=testuser:testpass put ${binaryPath} binary.bin`)

      // Verify no error occurred
      expect(result.error).toBeFalsy()

      // Verify output contains success message
      expect(result).toContain('updated successfully')
    })

    it('should handle error responses gracefully', () => {
      // Mock the HTTP request with an error response
      nock(baseUrl)
        .get('/non-existent.txt')
        .reply(404, 'File not found')

      // Execute the command
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} get non-existent.txt`)

      // Verify error was caught
      expect(result.error).toBeTrue()
      expect(result.stderr).toContain('Error getting file: HTTP error! Status: 404')
    })

    it('should handle authentication failures gracefully', () => {
      // Mock the HTTP request with an authentication failure
      nock(baseUrl)
        .post('/protected.txt')
        .reply(401, 'Authentication required')

      // Execute the command
      const localFilePath = getTestFilePath('test-data.txt')
      const result = safeExecSync(`node ${CLIENT_PATH} --baseUrl=${baseUrl} --auth=wrong:credentials post ${localFilePath} protected.txt`)

      // Verify error was caught
      expect(result.error).toBeTrue()
      expect(result.stderr).toContain('Error creating file: HTTP error! Status: 401')
    })
  })
})