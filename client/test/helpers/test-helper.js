import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mockFs from 'mock-fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_TEMP_DIR = path.join(__dirname, '..', 'temp')

// Helper to set up mock file system
export function setupMockFileSystem() {
  // Ensure any real directories needed by the tests exist before mocking
  if (!fs.existsSync(TEST_TEMP_DIR)) {
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true })
  }

  // Create a mock file system for testing with more realistic content
  mockFs({
    [TEST_TEMP_DIR]: {
      'local-file.txt': 'This is a local file for testing',
      'local-file.json': JSON.stringify({ test: 'data' }),
      'binary-file.bin': Buffer.from([0x00, 0x01, 0x02, 0x03])
    },
    // Add output directory that tests will write to
    'output': {},
    // Add a node_modules mock to prevent errors with module resolution during testing
    'node_modules': mockFs.directory({
      mode: 0o755,
      items: {
        'mock-fs': mockFs.directory({
          items: mockFs.load(path.resolve(__dirname, '../../../node_modules/mock-fs'))
        }),
        'nock': mockFs.directory({
          items: mockFs.load(path.resolve(__dirname, '../../../node_modules/nock'))
        })
      }
    })
  })
}

// Helper to clean up the mock file system
export function cleanupMockFileSystem() {
  mockFs.restore()

  // Optional: Clean up real test directory after tests
  if (fs.existsSync(TEST_TEMP_DIR)) {
    try {
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
    } catch (err) {
      console.warn(`Warning: Could not remove test directory: ${err.message}`)
    }
  }
}

// Helper to create test temp directory
export function createTestTempDir() {
  if (!fs.existsSync(TEST_TEMP_DIR)) {
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true })
  }
  return TEST_TEMP_DIR
}

// Helper to remove test temp directory
export function removeTestTempDir() {
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
  }
}

// Helper to create a test file
export function createTestFile(filepath, content) {
  const fullPath = path.join(TEST_TEMP_DIR, filepath)
  const dir = path.dirname(fullPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(fullPath, content)
  } else {
    fs.writeFileSync(fullPath, content, 'utf8')
  }

  return fullPath
}

// Helper to check if a file exists
export function fileExists(filepath) {
  return fs.existsSync(filepath)
}

// Helper to read file content
export function readTestFile(filepath, encoding = 'utf8') {
  const fullPath = typeof filepath === 'string' && !filepath.startsWith(TEST_TEMP_DIR)
    ? path.join(TEST_TEMP_DIR, filepath)
    : filepath

  if (encoding === null) {
    return fs.readFileSync(fullPath) // Return buffer for binary files
  }
  return fs.readFileSync(fullPath, encoding)
}

// Get test file path
export function getTestFilePath(filename) {
  return path.join(TEST_TEMP_DIR, filename)
}

// Helper to create binary test data
export function createBinaryTestData(size = 1024) {
  const buffer = Buffer.alloc(size)
  for (let i = 0; i < size; i++) {
    buffer[i] = i % 256
  }
  return buffer
}

// Get a random temporary file path
export function getRandomFilePath(prefix = 'test-', extension = '.tmp') {
  const randomName = `${prefix}${Date.now()}-${Math.floor(Math.random() * 10000)}${extension}`
  return path.join(TEST_TEMP_DIR, randomName)
}