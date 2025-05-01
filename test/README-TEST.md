# WebStore Test Suite

 Right now failing tests are renamed to hide them from Jasmine. The manual test in [post-test.md](post-test.md) is what can be trusted.


## Pass

Trivial Jasmine setup tests :

npm test -- test/e2e/simple.spec.js
npm test -- test/server/simple.spec.js
npm test -- test/client/simple.spec.js

Proper tests :

npm test -- test/server/WebStore.integration.spec.js

# Fail

npm test -- test/client/wstore.unit.spec.js # silly when run isolated
npm test -- test/server/WebStore.unit.spec.js

The following all mess up by trying to run the server in the same thread:

npm test -- test/e2e/e2e-core.spec.js #  post, get, delete
npm test -- test/client/wstore.integration.spec.js # Claude
npm test -- test/e2e/e2e.spec.js # Claude

---

The stuff below was written by Claude in a previous pass.

This test suite provides comprehensive testing for the WebStore server and client components. It includes unit tests, integration tests, and end-to-end tests to ensure the functionality works as expected.

## Test Structure

The tests are organized as follows:

```
webstore-project/
│
├── server/                      # Server application
│   ├── test/                    # Server tests
│   │   ├── helpers/             # Test helpers
│   │   │   └── test-helper.js   # Common test utilities
│   │   ├── WebStore.unit.spec.js     # Unit tests for server
│   │   └── WebStore.integration.spec.js  # Integration tests for server
│   └── jasmine.json             # Jasmine configuration for server tests
│
├── client/                      # Command line client
│   ├── test/                    # Client tests
│   │   ├── helpers/             # Test helpers
│   │   │   └── test-helper.js   # Common test utilities
│   │   ├── wstore.unit.spec.js       # Unit tests for client
│   │   └── wstore.integration.spec.js    # Integration tests for client
│   └── jasmine.json             # Jasmine configuration for client tests
│
├── test/                        # End-to-end tests
│   └── e2e.spec.js              # Tests server and client together
│
└── run-tests.js                 # Test runner script
```

## Setup

Before running the tests, you need to install the necessary dependencies:

1. Install server dependencies:

   ```bash
   cd server
   npm install
   ```

2. Install client dependencies:

   ```bash
   cd client
   npm install
   ```

3. Install root-level dependencies for E2E tests:
   ```bash
   npm install jasmine@5.1.0
   ```

## Running Tests

There are several ways to run the tests:

### Using the Test Runner Script

The easiest way to run all tests is to use the included test runner script:

```bash
node run-tests.js
```

This will run all tests in sequence and provide a summary of the results.

### Running Individual Test Suites

You can also run each test suite individually:

#### Server Tests

```bash
cd server
npm test -- test/WebStore.unit.spec.js
npm test -- test/WebStore.integration.spec.js
```

#### Client Tests

```bash
cd client
npm test -- test/wstore.unit.spec.js
npm test -- test/wstore.integration.spec.js
```

#### End-to-End Tests

```bash
NODE_OPTIONS=--experimental-vm-modules npx jasmine test/e2e.spec.js
```

## Test Types

### Unit Tests

Unit tests focus on testing individual components in isolation. For the server, this includes testing route handlers and file operations. For the client, this includes testing the `WStoreClient` class methods.

### Integration Tests

Integration tests verify that different parts of the application work together correctly. For the server, this includes testing the Express application as a whole. For the client, this includes testing the command-line interface.

### End-to-End Tests

End-to-end tests verify that the entire system works together. These tests start the server with a test configuration and then use the client to interact with it, verifying that the expected results occur.

## Test Coverage

The test suite covers:

- **Basic HTTP methods**: GET, POST, PUT, DELETE
- **Authentication**: Testing that write operations require authentication
- **Error handling**: Testing 404, 401, 409 responses
- **File operations**: Testing creation, reading, updating, and deletion of files
- **Directory structure**: Testing nested directory support
- **Binary file handling**: Testing that binary files are preserved correctly
- **Command-line options**: Testing various client command-line options

## Troubleshooting

If you encounter issues running the tests:

1. Make sure all dependencies are installed
2. Check that the server is not already running on the test ports (4500, 4501, 4510)
3. Ensure you have the necessary permissions to create files in the test directories
4. For Windows users, you may need to adjust file paths in the test scripts

npm test -- server/test/WebStore.unit.spec.js
