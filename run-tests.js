#!/usr/bin/env node
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = __dirname

// Test configurations
const SERVER_DIR = path.join(ROOT_DIR, 'server')
const CLIENT_DIR = path.join(ROOT_DIR, 'client')
const E2E_TEST_DIR = path.join(ROOT_DIR, 'test')

// Terminal colors for better reporting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

console.log(`${colors.bright}${colors.cyan}=== WebStore Test Suite Runner ===${colors.reset}`)

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
}

// Run a test suite with proper error handling
function runTestSuite(name, command, cwd) {
  console.log(`\n${colors.bright}${colors.blue}=== Running ${name} ===${colors.reset}`)
  const startTime = new Date().getTime()

  try {
    const output = execSync(command, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-vm-modules'
      }
    })

    // Calculate elapsed time
    const elapsedTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
    console.log(`${colors.green}✅ ${name} passed${colors.reset} (${elapsedTime}s)`)

    // Print any relevant output
    console.log(output)

    testResults.passed++
    testResults.total++
    return true
  } catch (error) {
    // Calculate elapsed time
    const elapsedTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
    console.error(`${colors.red}❌ ${name} failed${colors.reset} (${elapsedTime}s)`)

    // Print any errors or output
    if (error.stdout) console.error(error.stdout.toString())
    if (error.stderr) console.error(error.stderr.toString())

    testResults.failed++
    testResults.total++
    return false
  }
}

// Run server unit tests - uses existing jasmine.json config
const serverUnitSuccess = runTestSuite(
  'Server Unit Tests',
  'npx jasmine --config=jasmine.json test/WebStore.unit.spec.js',
  SERVER_DIR
)

// Run server integration tests - uses existing jasmine.json config
const serverIntegrationSuccess = runTestSuite(
  'Server Integration Tests',
  'npx jasmine --config=jasmine.json test/WebStore.integration.spec.js',
  SERVER_DIR
)

// Run client unit tests - uses existing jasmine.json config
const clientUnitSuccess = runTestSuite(
  'Client Unit Tests',
  'npx jasmine --config=jasmine.json test/wstore.unit.spec.js',
  CLIENT_DIR
)

// Run client integration tests - uses existing jasmine.json config
const clientIntegrationSuccess = runTestSuite(
  'Client Integration Tests',
  'npx jasmine --config=jasmine.json test/wstore.integration.spec.js',
  CLIENT_DIR
)

// Run end-to-end tests
if (serverUnitSuccess && serverIntegrationSuccess && clientUnitSuccess && clientIntegrationSuccess) {
  const e2eSuccess = runTestSuite(
    'End-to-End Tests',
    'npx jasmine test/e2e.spec.js',
    ROOT_DIR
  )

  if (!e2eSuccess) {
    process.exit(1)
  }
} else {
  console.log(`\n${colors.yellow}⚠️ Skipping End-to-End Tests due to failures in unit or integration tests${colors.reset}`)
}

// Print summary
console.log(`\n${colors.bright}${colors.blue}=== Test Summary ===${colors.reset}`)
console.log(`${colors.green}✅ Tests Passed: ${testResults.passed}/${testResults.total}${colors.reset}`)
console.log(`${colors.red}❌ Tests Failed: ${testResults.failed}/${testResults.total}${colors.reset}`)

// Exit with appropriate code
if (testResults.failed === 0) {
  console.log(`\n${colors.bright}${colors.green}=== All Tests Passed Successfully ===${colors.reset}`)
  process.exit(0)
} else {
  console.log(`\n${colors.bright}${colors.red}=== Tests Completed with ${testResults.failed} Failures ===${colors.reset}`)
  process.exit(1)
}