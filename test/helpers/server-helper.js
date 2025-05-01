import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Use test-storage directory relative to the test file (e.g., test/server/test-storage)
const TEST_STORAGE_DIR = path.join(__dirname, '../server/test-storage')

// Helper to set up test file system (real FS only)
export function setupMockFileSystem() {
  // No-op for integration tests; use real FS
}

// Helper to clean up the mock file system (real FS only)
export function cleanupMockFileSystem() {
  // No-op for integration tests; use real FS
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