import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mockFs from 'mock-fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_STORAGE_DIR = path.join(__dirname, '..', 'test-storage')

// Helper to set up mock file system
export function setupMockFileSystem() {
  // Create a real directory first (needed for path resolution)
  if (!fs.existsSync(TEST_STORAGE_DIR)) {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true })
  }

  // Apply mock filesystem after creating real directory
  mockFs({
    [TEST_STORAGE_DIR]: {
      'existing-file.txt': Buffer.from('This is an existing file for testing'),
      'directory': {
        'nested-file.txt': Buffer.from('This is a nested file')
      }
    },
    // Keep node_modules available
    'node_modules': mockFs.load(path.resolve(__dirname, '../../../node_modules'))
  })
}

// Helper to clean up the mock file system
export function cleanupMockFileSystem() {
  mockFs.restore()
}

// Helper to create a test configuration
export function getTestConfig() {
  return {
    storageDir: TEST_STORAGE_DIR,
    username: 'testuser',
    password: 'testpass'
  }
}

// Helper to create test storage directory
export function createTestStorageDir() {
  if (!fs.existsSync(TEST_STORAGE_DIR)) {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true })
  }
  return TEST_STORAGE_DIR
}

// Helper to remove test storage directory
export function removeTestStorageDir() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    try {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true })
    } catch (err) {
      console.error(`Failed to remove ${TEST_STORAGE_DIR}:`, err)
    }
  }
}

// Helper to create a test file
export function createTestFile(filepath, content) {
  const fullPath = path.join(TEST_STORAGE_DIR, filepath)
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
  const fullPath = path.join(TEST_STORAGE_DIR, filepath)
  return fs.existsSync(fullPath)
}

// Helper to read file content
export function readTestFile(filepath, encoding = 'utf8') {
  const fullPath = path.join(TEST_STORAGE_DIR, filepath)

  if (encoding === null) {
    return fs.readFileSync(fullPath) // Return buffer for binary files
  }
  return fs.readFileSync(fullPath, encoding)
}