import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import http from 'http'
import app from '../server/WebStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const PROJECT_ROOT = path.join(__dirname, '..')
const SERVER_DIR = path.join(PROJECT_ROOT, 'server')
const CLIENT_DIR = path.join(PROJECT_ROOT, 'client')
const TEST_DIR = path.join(PROJECT_ROOT, 'test')
const E2E_TEMP_DIR = path.join(TEST_DIR, 'e2e-temp')
const E2E_STORAGE_DIR = path.join(E2E_TEMP_DIR, 'storage')

// Server and client paths
const CLIENT_PATH = path.join(CLIENT_DIR, 'wstore.js')

// Test configuration
const TEST_PORT = 4510
const TEST_BASE_URL = `http://localhost:${TEST_PORT}/`
const TEST_USERNAME = 'e2euser'
const TEST_PASSWORD = 'e2epass'

describe('End-to-End Tests', () => {
  let server

  beforeAll(async () => {
    // Create test directories
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true })
    }

    if (!fs.existsSync(E2E_TEMP_DIR)) {
      fs.mkdirSync(E2E_TEMP_DIR, { recursive: true })
    }

    if (!fs.existsSync(E2E_STORAGE_DIR)) {
      fs.mkdirSync(E2E_STORAGE_DIR, { recursive: true })
    }

    // Create test files in the storage directory
    fs.writeFileSync(
      path.join(E2E_STORAGE_DIR, 'existing-file.txt'),
      'This is an existing file in the storage directory'
    )

    // Set environment variables for the server
    process.env.NODE_ENV = 'test'
    process.env.PORT = TEST_PORT
    process.env.STORAGE_DIR = E2E_STORAGE_DIR
    process.env.AUTH_USERNAME = TEST_USERNAME
    process.env.AUTH_PASSWORD = TEST_PASSWORD

    // Start the server
    server = http.createServer(app)
    await new Promise(resolve => {
      server.listen(TEST_PORT, () => {
        console.log(`Test server running on port ${TEST_PORT}`)
        resolve()
      })
    })
  })

  afterAll(() => {
    // Stop the server
    if (server) {
      server.close()
    }

    // Clean up test directories
    if (fs.existsSync(E2E_TEMP_DIR)) {
      fs.rmSync(E2E_TEMP_DIR, { recursive: true, force: true })
    }

    // Reset environment variables
    delete process.env.NODE_ENV
    delete process.env.PORT
    delete process.env.STORAGE_DIR
    delete process.env.AUTH_USERNAME
    delete process.env.AUTH_PASSWORD
  })

  describe('Basic Operations', () => {
    // Test files
    const TEST_FILES = {
      textFile: {
        local: path.join(E2E_TEMP_DIR, 'local-text.txt'),
        remote: 'remote-text.txt',
        content: 'This is a text file for E2E testing'
      },
      jsonFile: {
        local: path.join(E2E_TEMP_DIR, 'local-data.json'),
        remote: 'remote-data.json',
        content: JSON.stringify({ test: 'data', number: 42 })
      },
      binaryFile: {
        local: path.join(E2E_TEMP_DIR, 'local-binary.bin'),
        remote: 'remote-binary.bin',
        content: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04])
      }
    }

    beforeEach(() => {
      // Create test files
      Object.values(TEST_FILES).forEach(file => {
        fs.writeFileSync(file.local, file.content)
      })
    })

    it('should GET an existing file from the server', () => {
      const outputPath = path.join(E2E_TEMP_DIR, 'get-output.txt')

      // Execute GET command
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} get existing-file.txt ${outputPath}`,
        { encoding: 'utf8' }
      )

      // Verify file was retrieved
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual(
        'This is an existing file in the storage directory'
      )
    })

    it('should POST a new file to the server', () => {
      const { local, remote, content } = TEST_FILES.textFile

      // Execute POST command
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} post ${local} ${remote}`,
        { encoding: 'utf8' }
      )

      // Verify file was created on the server
      expect(fs.existsSync(path.join(E2E_STORAGE_DIR, remote))).toBeTrue()
      expect(fs.readFileSync(path.join(E2E_STORAGE_DIR, remote), 'utf8')).toEqual(content)

      // Verify output indicates success
      expect(output).toContain('created successfully')
    })

    it('should PUT a file to update it on the server', () => {
      const { local, remote } = TEST_FILES.jsonFile

      // First, create the file
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} post ${local} ${remote}`,
        { encoding: 'utf8' }
      )

      // Modify the local file
      const updatedContent = JSON.stringify({ test: 'updated', number: 99 })
      fs.writeFileSync(local, updatedContent)

      // Execute PUT command
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} put ${local} ${remote}`,
        { encoding: 'utf8' }
      )

      // Verify file was updated on the server
      expect(fs.readFileSync(path.join(E2E_STORAGE_DIR, remote), 'utf8')).toEqual(updatedContent)

      // Verify output indicates success
      expect(output).toContain('updated successfully')
    })

    it('should PUT a file to create it if it does not exist', () => {
      const { local } = TEST_FILES.binaryFile

      // Execute PUT command
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} put ${local} new-file-via-put.bin`,
        { encoding: 'utf8' }
      )

      // Verify file was created on the server
      expect(fs.existsSync(path.join(E2E_STORAGE_DIR, 'new-file-via-put.bin'))).toBeTrue()

      // Verify output indicates success
      expect(output).toContain('updated successfully')
    })

    it('should DELETE a file from the server', () => {
      const { remote } = TEST_FILES.textFile

      // Ensure the file exists
      expect(fs.existsSync(path.join(E2E_STORAGE_DIR, remote))).toBeTrue()

      // Execute DELETE command
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} delete ${remote}`,
        { encoding: 'utf8' }
      )

      // Verify file was deleted from the server
      expect(fs.existsSync(path.join(E2E_STORAGE_DIR, remote))).toBeFalse()

      // Verify output indicates success
      expect(output).toContain('deleted successfully')
    })

    it('should handle nested directories', () => {
      const nestedPath = 'nested/directory/file.txt'
      const localPath = path.join(E2E_TEMP_DIR, 'nested-test.txt')
      const content = 'Content for nested file test'

      // Create local file
      fs.writeFileSync(localPath, content)

      // PUT file in nested directory
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} put ${localPath} ${nestedPath}`,
        { encoding: 'utf8' }
      )

      // Verify file was created with proper structure
      const serverFilePath = path.join(E2E_STORAGE_DIR, nestedPath)
      expect(fs.existsSync(serverFilePath)).toBeTrue()
      expect(fs.readFileSync(serverFilePath, 'utf8')).toEqual(content)

      // GET the file
      const outputPath = path.join(E2E_TEMP_DIR, 'nested-output.txt')
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} get ${nestedPath} ${outputPath}`,
        { encoding: 'utf8' }
      )

      // Verify retrieved content
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual(content)

      // DELETE the file
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} delete ${nestedPath}`,
        { encoding: 'utf8' }
      )

      // Verify file was deleted
      expect(fs.existsSync(serverFilePath)).toBeFalse()
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 error when file does not exist', () => {
      // Try to GET a non-existent file
      let errorThrown = false
      try {
        execSync(
          `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} get non-existent-file.txt`,
          { encoding: 'utf8', stdio: 'pipe' }
        )
      } catch (error) {
        errorThrown = true
        expect(error.status).not.toEqual(0)
        expect(error.stderr.toString()).toContain('Error getting file')
        expect(error.stderr.toString()).toContain('HTTP error! Status: 404')
      }

      expect(errorThrown).toBeTrue()
    })

    it('should handle 409 error when POST to existing file', () => {
      // Create a test file
      const localPath = path.join(E2E_TEMP_DIR, 'conflict-test.txt')
      const remotePath = 'conflict-file.txt'
      const content = 'Content for conflict test'

      // Create local file
      fs.writeFileSync(localPath, content)

      // POST to create the file first time
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} post ${localPath} ${remotePath}`,
        { encoding: 'utf8' }
      )

      // Try to POST the same file again - should fail with 409
      let errorThrown = false
      try {
        execSync(
          `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} post ${localPath} ${remotePath}`,
          { encoding: 'utf8', stdio: 'pipe' }
        )
      } catch (error) {
        errorThrown = true
        expect(error.status).not.toEqual(0)
        expect(error.stderr.toString()).toContain('Error creating file')
        expect(error.stderr.toString()).toContain('HTTP error! Status: 409')
      }

      expect(errorThrown).toBeTrue()
    })

    it('should handle authentication errors', () => {
      // Try to POST without proper authentication
      const localPath = path.join(E2E_TEMP_DIR, 'auth-test.txt')
      fs.writeFileSync(localPath, 'Content for auth test')

      let errorThrown = false
      try {
        execSync(
          `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=wrong:credentials post ${localPath} auth-file.txt`,
          { encoding: 'utf8', stdio: 'pipe' }
        )
      } catch (error) {
        errorThrown = true
        expect(error.status).not.toEqual(0)
        expect(error.stderr.toString()).toContain('Error creating file')
        expect(error.stderr.toString()).toContain('HTTP error! Status: 401')
      }

      expect(errorThrown).toBeTrue()
    })
  })

  describe('Advanced Features', () => {
    it('should handle binary files correctly', () => {
      // Create a binary file with a more complex pattern
      const binaryPath = path.join(E2E_TEMP_DIR, 'complex-binary.bin')
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // Chunk length
        0x49, 0x48, 0x44, 0x52  // IHDR chunk
      ])
      fs.writeFileSync(binaryPath, binaryContent)

      // PUT binary file
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} put ${binaryPath} binary-test.bin`,
        { encoding: 'utf8' }
      )

      // Verify file exists on server
      const serverFilePath = path.join(E2E_STORAGE_DIR, 'binary-test.bin')
      expect(fs.existsSync(serverFilePath)).toBeTrue()

      // Verify binary content is preserved
      const retrievedContent = fs.readFileSync(serverFilePath)
      expect(Buffer.compare(retrievedContent, binaryContent)).toEqual(0)

      // GET the binary file
      const outputPath = path.join(E2E_TEMP_DIR, 'binary-output.bin')
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} get binary-test.bin ${outputPath}`,
        { encoding: 'utf8' }
      )

      // Verify retrieved content matches original
      const retrievedFile = fs.readFileSync(outputPath)
      expect(Buffer.compare(retrievedFile, binaryContent)).toEqual(0)
    })

    it('should allow writing response to file with -o option', () => {
      // PUT a test file
      const testPath = path.join(E2E_TEMP_DIR, 'output-test.txt')
      fs.writeFileSync(testPath, 'Content for output test')

      // Execute PUT with output option
      const outputPath = path.join(E2E_TEMP_DIR, 'response-output.txt')
      execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} --auth=${TEST_USERNAME}:${TEST_PASSWORD} put ${testPath} output-test.txt -o ${outputPath}`,
        { encoding: 'utf8' }
      )

      // Verify response was written to file
      expect(fs.existsSync(outputPath)).toBeTrue()
      expect(fs.readFileSync(outputPath, 'utf8')).toEqual('File updated')
    })

    it('should display response headers with -i option', () => {
      // GET a file with -i option
      const output = execSync(
        `node ${CLIENT_PATH} --baseUrl=${TEST_BASE_URL} -i get existing-file.txt`,
        { encoding: 'utf8' }
      )

      // Verify headers are included in the output
      expect(output).toContain('HTTP Response Headers:')
      // Should have at least one header
      expect(output).toMatch(/[a-zA-Z-]+: .+/)
    })
  })
})