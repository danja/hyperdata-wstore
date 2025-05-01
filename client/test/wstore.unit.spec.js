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
import { WStoreClient } from '../wstore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Add buffer method to Response prototype for tests
Response.prototype.buffer = function () {
  return this.arrayBuffer().then(arr => Buffer.from(arr))
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
    spyOn(console, 'log').and.callThrough()
    spyOn(console, 'error').and.callThrough()
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
        `File ${localFilePath} created successfully at remote-file.txt`
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
        `File ${localFilePath} updated successfully at remote-file.txt`
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