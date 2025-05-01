// e2e-core.spec.js
// This test automates the steps from post-test.md to verify the core e2e workflow.

import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

function waitForServer(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
        } else {
          if (Date.now() - start > timeout) {
            reject(new Error('Server did not start in time'));
          } else {
            setTimeout(check, 100);
          }
        }
        res.resume(); // Drain response
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 100);
        }
      });
    }
    check();
  });
}

describe('WebStore core e2e workflow', () => {
  const clientDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../client');
  const helloJson = path.join(clientDir, 'hello.json');
  const baseUrl = 'http://localhost:4500/';
  const auth = 'admin:password';
  const target = 'tests/hello.json';
  const wstore = './wstore.js';
  let serverProcess;

  beforeAll(async () => {
    // Start the server in a child process
    serverProcess = spawn('node', ['server/WebStore.js'], {
      cwd: path.resolve(clientDir, '..'),
      stdio: 'ignore',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '4500',
        STORAGE_DIR: path.resolve(clientDir, '../server/storage'),
        AUTH_USERNAME: 'admin',
        AUTH_PASSWORD: 'password'
      }
    });
    // Wait for server to be ready (root endpoint)
    await waitForServer('http://localhost:4500/');
    // Ensure hello.json exists
    if (!fs.existsSync(helloJson)) {
      fs.writeFileSync(helloJson, JSON.stringify({ hello: 'world' }, null, 2));
    }
  }, 15000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('should POST hello.json to the server', () => {
    const cmd = `${wstore} --baseUrl=${baseUrl} --auth=${auth} post ./hello.json ${target}`;
    const output = execSync(cmd, { cwd: clientDir }).toString();
    expect(output).toMatch(/created successfully/);
  });

  it('should GET the posted file and return correct content', () => {
    const cmd = `${wstore} -i get ${target}`;
    const output = execSync(cmd, { cwd: clientDir }).toString();
    expect(output).toMatch(/content-type: application\/json/);
    expect(output).toMatch(/\{\s*"hello"\s*:\s*"world"\s*\}/);
  });

  it('should DELETE the file', () => {
    const cmd = `${wstore} -i --auth=${auth} delete ${target}`;
    const output = execSync(cmd, { cwd: clientDir }).toString();
    expect(output).toMatch(/deleted successfully/);
  });

  it('should return 404 for deleted file', () => {
    const cmd = `${wstore} get ${target}`;
    let output = '';
    try {
      output = execSync(cmd, { cwd: clientDir }).toString();
    } catch (e) {
      output = e.stdout ? e.stdout.toString() : '';
    }
    expect(output).toMatch(/404.*File not found/);
  });
});
