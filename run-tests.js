#!/usr/bin/env node
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = __dirname

// Test configurations
const SERVER_DIR = path.join(ROOT_DIR, 'server')
const CLIENT_DIR = path.join(ROOT_DIR, 'client')
const E2E_TEST_DIR = path.join(ROOT_DIR, 'test')

// Ensure all test directories exist
if (!fs.existsSync(E2E_TEST_DIR)) {
  fs.mkdirSync(E2E_TEST_DIR, { recursive: true })
}

// Create helpers directories if they don't exist
const serverHelpersDir = path.join(SERVER_DIR, 'test', 'helpers')
const clientHelpersDir = path.join(CLIENT_DIR, 'test', 'helpers')

if (!fs.existsSync(serverHelpersDir)) {
  fs.mkdirSync(serverHelpersDir, { recursive: true })
}

if (!fs.existsSync(clientHelpersDir)) {
  fs.mkdirSync(clientHelpersDir, { recursive: true })
}

console.log('=== WebStore Test Suite Runner ===')

// Common options for all Jasmine runs
const jasmineOptions = {
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-vm-modules'
  }
}

// Run server unit tests
console.log('\n=== Running Server Unit Tests ===')
try {
  execSync('npx jasmine test/WebStore.unit.spec.js', {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    ...jasmineOptions
  })
  console.log('✅ Server unit tests passed')
} catch (error) {
  console.error('❌ Server unit tests failed')
  process.exit(1)
}

// Run server integration tests
console.log('\n=== Running Server Integration Tests ===')
try {
  execSync('npx jasmine test/WebStore.integration.spec.js', {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    ...jasmineOptions
  })
  console.log('✅ Server integration tests passed')
} catch (error) {
  console.error('❌ Server integration tests failed')
  process.exit(1)
}

// Run client unit tests
console.log('\n=== Running Client Unit Tests ===')
try {
  execSync('npx jasmine test/wstore.unit.spec.js', {
    cwd: CLIENT_DIR,
    stdio: 'inherit',
    ...jasmineOptions
  })
  console.log('✅ Client unit tests passed')
} catch (error) {
  console.error('❌ Client unit tests failed')
  process.exit(1)
}

// Run client integration tests
console.log('\n=== Running Client Integration Tests ===')
try {
  execSync('npx jasmine test/wstore.integration.spec.js', {
    cwd: CLIENT_DIR,
    stdio: 'inherit',
    ...jasmineOptions
  })
  console.log('✅ Client integration tests passed')
} catch (error) {
  console.error('❌ Client integration tests failed')
  process.exit(1)
}

// Run end-to-end tests
console.log('\n=== Running End-to-End Tests ===')
try {
  execSync('npx jasmine test/e2e.spec.js', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    ...jasmineOptions
  })
  console.log('✅ End-to-end tests passed')
} catch (error) {
  console.error('❌ End-to-end tests failed')
  process.exit(1)
}

console.log('\n=== All Tests Passed Successfully ===')