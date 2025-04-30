import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mockFs from 'mock-fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_TEMP_DIR = path.join(__dirname, '..', 'temp');

// Helper to set up mock file system
export function setupMockFileSystem() {
  // Create a mock file system for testing
  mockFs({
    [TEST_TEMP_DIR]: {
      'local-file.txt': 'This is a local file for testing',
      'local-file.json': JSON.stringify({ test: 'data' }),
    },
    'output': {}
  });
}

// Helper to clean up the mock file system
export function cleanupMockFileSystem() {
  mockFs.restore();
}

// Helper to create test temp directory
export function createTestTempDir() {
  if (!fs.existsSync(TEST_TEMP_DIR)) {
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  }
}

// Helper to remove test temp directory
export function removeTestTempDir() {
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
}

// Helper to create a test file
export function createTestFile(filepath, content) {
  const fullPath = path.join(TEST_TEMP_DIR, filepath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

// Helper to check if a file exists
export function fileExists(filepath) {
  return fs.existsSync(filepath);
}

// Helper to read file content
export function readTestFile(filepath) {
  return fs.readFileSync(filepath, 'utf8');
}

// Get test file path
export function getTestFilePath(filename) {
  return path.join(TEST_TEMP_DIR, filename);
}