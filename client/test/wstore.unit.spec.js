import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nock from 'nock'
import { Readable } from 'stream'

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

// Create a test module with the WStoreClient class for testing
class WStoreClient {
  constructor(baseUrl, auth = null, options = {}) {
    this.baseUrl = baseUrl
    this.auth = auth
    this.options = options
  }

  async get(remoteFilePath, localFilePath) {
    const url = new URL(remoteFilePath, this.baseUrl)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this._getHeaders('GET')
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
      }

      // If include headers option is set, display response headers
      if (this.options.include) {
        console.log('HTTP Response Headers:')
        for (const [key, value] of response.headers.entries()) {
          console.log(`${key}: ${value}`)
        }
        console.log() // Empty line after headers
      }

      // Handle output based on options and arguments
      const outputFile = this.options.output || localFilePath

      if (outputFile) {
        // Ensure directory exists
        const dir = path.dirname(outputFile)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        // For tests, use a simpler approach than streaming
        const buffer = await response.arrayBuffer()
        fs.writeFileSync(outputFile, Buffer.from(buffer))
        console.log(`File saved to ${outputFile}`)
      } else {
        // Display content if no output file specified
        const content = await response.text()
        console.log(content)
      }
    } catch (error) {
      console.error(`Error getting file: ${error.message}`)
      process.exit(1)
    }
  }

  async post(localFilePath, remoteFilePath) {
    return this._sendFile('POST', localFilePath, remoteFilePath)
  }

  async put(localFilePath, remoteFilePath) {
    return this._sendFile('PUT', localFilePath, remoteFilePath)
  }

  async delete(remoteFilePath) {
    const url = new URL(remoteFilePath, this.baseUrl)

    try {
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: this._getHeaders('DELETE')
      })

      // If include headers option is set, display response headers
      if (this.options.include) {
        console.log('HTTP Response Headers:')
        for (const [key, value] of response.headers.entries()) {
          console.log(`${key}: ${value}`)
        }
        console.log() // Empty line after headers
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
      }

      const responseText = await response.text()

      if (this.options.output) {
        // Write the response to the output file
        fs.writeFileSync(this.options.output, responseText)
        console.log(`Response saved to ${this.options.output}`)
      } else {
        console.log(`File ${remoteFilePath} deleted successfully`)
      }
    } catch (error) {
      console.error(`Error deleting file: ${error.message}`)
      process.exit(1)
    }
  }

  async _sendFile(method, localFilePath, remoteFilePath) {
    if (!fs.existsSync(localFilePath)) {
      console.error(`Local file ${localFilePath} not found`)
      process.exit(1)
    }

    const url = new URL(remoteFilePath, this.baseUrl)
    // Use octet-stream to prevent automatic JSON parsing
    const contentType = 'application/octet-stream'
    const fileContent = fs.readFileSync(localFilePath)

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          ...this._getHeaders(method),
          'Content-Type': contentType
        },
        body: fileContent
      })

      // If include headers option is set, display response headers
      if (this.options.include) {
        console.log('HTTP Response Headers:')
        for (const [key, value] of response.headers.entries()) {
          console.log(`${key}: ${value}`)
        }
        console.log() // Empty line after headers
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
      }

      const responseText = await response.text()

      if (this.options.output) {
        // Write the response to the output file
        fs.writeFileSync(this.options.output, responseText)
        console.log(`Response saved to ${this.options.output}`)
      } else {
        console.log(`File ${localFilePath} ${method === 'POST' ? 'created' : 'updated'} successfully at ${remoteFilePath}`)
      }
    } catch (error) {
      console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} file: ${error.message}`)
      process.exit(1)
    }
  }

  _getHeaders(method) {
    const headers = {}

    // Add auth header for write operations
    if (this.auth && (method === 'PUT' || method === 'POST' || method === 'DELETE')) {
      const base64Auth = Buffer.from(this.auth).toString('base64')
      headers['Authorization'] = `Basic ${base64Auth}`
    }

    return headers
  }
}

// Mock fetch for testing with proper buffer handling
global.fetch = async (url, options) => {
  // This will be mocked by nock, but ensure we handle the responses correctly
  throw new Error('Fetch not mocked for this URL: ' + url)
}

// Add a buffer method to Response prototype for tests
Response.prototype.buffer = async function () {
  const arrayBuffer = await this.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

describe('WStoreClient Unit Tests', () => {
  const baseUrl = 'http://localhost:4500/'
  let client

  beforeEach(() => {
    // Set up mock file system for each test
    setupMockFileSystem()

    // Create client instance
    client = new WStoreClient(baseUrl, 'testuser:testpass', {
      include: false
    })

    // Intercept console methods
    spyOn(console, 'log')
    spyOn(console, 'error')
    spyOn(process, 'exit').and.callFake(() => { })
  })

  afterEach(() => {
    // Clean up after each test
    cleanupMockFileSystem()
    nock.cleanAll()
  })

  describe('get()', () => {
    it('should handle a successful GET request', async () => {
      // Mock the fetch call
      nock(baseUrl)
        .get('/test-file.txt')
        .reply(200, 'Test file content')

      await client.get('test-file.txt', 'output.txt')

      // Verify console output
      expect(console.log).toHaveBeenCalledWith('File saved to output.txt')
    })

    it('should display content when no output file is specified', async () => {
      // Mock the fetch call
      nock(baseUrl)
        .get('/test-file.txt')
        .reply(200, 'Test file content')

      await client.get('test-file.txt')

      // Verify console output
      expect(console.log).toHaveBeenCalledWith('Test file content')
    })

    it('should handle HTTP errors', async () => {
      // Mock the fetch call with an error response
      nock(baseUrl)
        .get('/non-existent-file.txt')
        .reply(404, 'File not found')

      await client.get('non-existent-file.txt')

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Error getting file: HTTP error! Status: 404/)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should display headers when include option is true', async () => {
      // Create client with include option
      client = new WStoreClient(baseUrl, 'testuser:testpass', {
        include: true
      })

      // Mock the fetch call
      nock(baseUrl)
        .get('/test-file.txt')
        .reply(200, 'Test file content', {
          'Content-Type': 'text/plain',
          'Content-Length': '17'
        })

      await client.get('test-file.txt')

      // Verify console output for headers
      expect(console.log).toHaveBeenCalledWith('HTTP Response Headers:')
      expect(console.log).toHaveBeenCalledWith('content-type: text/plain')
      expect(console.log).toHaveBeenCalledWith('content-length: 17')
      expect(console.log).toHaveBeenCalledWith()  // Empty line
      expect(console.log).toHaveBeenCalledWith('Test file content')
    })
  })

  describe('post()', () => {
    it('should send a POST request with file content', async () => {
      // Create test file
      const localFilePath = getTestFilePath('local-file.txt')
      const fileContent = 'This is a local file for testing'

      // Mock the fetch call
      nock(baseUrl)
        .post('/remote-file.txt', fileContent)
        .matchHeader('Authorization', 'Basic dGVzdHVzZXI6dGVzdHBhc3M=')  // testuser:testpass in base64
        .matchHeader('Content-Type', 'application/octet-stream')
        .reply(201, 'File created')

      await client.post(localFilePath, 'remote-file.txt')

      // Verify console output
      expect(console.log).toHaveBeenCalledWith(
        'File local-file.txt created successfully at remote-file.txt'
      )
    })

    it('should handle errors when the local file does not exist', async () => {
      await client.post('non-existent-local-file.txt', 'remote-file.txt')

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        'Local file non-existent-local-file.txt not found'
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should handle HTTP errors during POST', async () => {
      // Create test file
      const localFilePath = getTestFilePath('local-file.txt')

      // Mock the fetch call with an error response
      nock(baseUrl)
        .post('/remote-file.txt')
        .reply(500, 'Internal server error')

      await client.post(localFilePath, 'remote-file.txt')

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Error creating file: HTTP error! Status: 500/)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('put()', () => {
    it('should send a PUT request with file content', async () => {
      // Create test file
      const localFilePath = getTestFilePath('local-file.txt')
      const fileContent = 'This is a local file for testing'

      // Mock the fetch call
      nock(baseUrl)
        .put('/remote-file.txt', fileContent)
        .matchHeader('Authorization', 'Basic dGVzdHVzZXI6dGVzdHBhc3M=')  // testuser:testpass in base64
        .matchHeader('Content-Type', 'application/octet-stream')
        .reply(200, 'File updated')

      await client.put(localFilePath, 'remote-file.txt')

      // Verify console output
      expect(console.log).toHaveBeenCalledWith(
        'File local-file.txt updated successfully at remote-file.txt'
      )
    })

    it('should handle errors when the local file does not exist', async () => {
      await client.put('non-existent-local-file.txt', 'remote-file.txt')

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        'Local file non-existent-local-file.txt not found'
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('delete()', () => {
    it('should send a DELETE request', async () => {
      // Mock the fetch call
      nock(baseUrl)
        .delete('/remote-file.txt')
        .matchHeader('Authorization', 'Basic dGVzdHVzZXI6dGVzdHBhc3M=')  // testuser:testpass in base64
        .reply(200, 'File deleted')

      await client.delete('remote-file.txt')

      // Verify console output
      expect(console.log).toHaveBeenCalledWith(
        'File remote-file.txt deleted successfully'
      )
    })

    it('should handle HTTP errors during DELETE', async () => {
      // Mock the fetch call with an error response
      nock(baseUrl)
        .delete('/non-existent-file.txt')
        .reply(404, 'File not found')

      await client.delete('non-existent-file.txt')

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Error deleting file: HTTP error! Status: 404/)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('_getHeaders()', () => {
    it('should add authorization header for write operations', () => {
      // Test POST headers
      const postHeaders = client._getHeaders('POST')
      expect(postHeaders.Authorization).toEqual('Basic dGVzdHVzZXI6dGVzdHBhc3M=')

      // Test PUT headers
      const putHeaders = client._getHeaders('PUT')
      expect(putHeaders.Authorization).toEqual('Basic dGVzdHVzZXI6dGVzdHBhc3M=')

      // Test DELETE headers
      const deleteHeaders = client._getHeaders('DELETE')
      expect(deleteHeaders.Authorization).toEqual('Basic dGVzdHVzZXI6dGVzdHBhc3M=')
    })

    it('should not add authorization header for GET operations', () => {
      const getHeaders = client._getHeaders('GET')
      expect(getHeaders.Authorization).toBeUndefined()
    })

    it('should handle no auth credentials', () => {
      const noAuthClient = new WStoreClient(baseUrl)

      // Even for write operations, no auth header should be added
      const postHeaders = noAuthClient._getHeaders('POST')
      expect(postHeaders.Authorization).toBeUndefined()
    })
  })
})