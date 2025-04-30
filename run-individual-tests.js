#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test files to run
const tests = [
  { name: 'Simple Client Test', cmd: 'cd client && npm test -- test/simple.spec.js' },
  { name: 'Simple Server Test', cmd: 'cd server && npm test -- test/simple.spec.js' },
  { name: 'Simple E2E Test', cmd: 'npm test -- test/simple.spec.js' }
];

/**
 * Run a command and return the result
 */
function runCommand(command) {
  try {
    return {
      success: true,
      output: execSync(command, { encoding: 'utf8' })
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout?.toString() || '',
      error: error.stderr?.toString() || error.message
    };
  }
}

/**
 * Main function to run tests
 */
function runTests() {
  console.log(`${colors.cyan}=== Running Individual Tests ===${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`${colors.blue}Running: ${test.name}${colors.reset}`);
    const result = runCommand(test.cmd);
    
    if (result.success) {
      console.log(`${colors.green}✓ PASSED: ${test.name}${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}✗ FAILED: ${test.name}${colors.reset}`);
      console.log(`${colors.yellow}Error: ${result.error}${colors.reset}`);
      failed++;
    }
    console.log(); // Empty line between tests
  }

  // Print summary
  console.log(`${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run the tests
runTests();
