import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_STORAGE_DIR = path.join(__dirname, 'test-storage-unit');
let app;

const TEST_USER = 'testuser';
const TEST_PASS = 'testpass';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${TEST_USER}:${TEST_PASS}`).toString('base64');

function cleanTestDir() {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
        fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
}

describe('WebStore server routes', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        process.env.STORAGE_DIR = TEST_STORAGE_DIR;
        process.env.AUTH_USERNAME = TEST_USER;
        process.env.AUTH_PASSWORD = TEST_PASS;
        cleanTestDir();
        const imported = await import('../../server/WebStore.js');
        app = imported.default;
    });

    afterAll(() => {
        cleanTestDir();
        delete process.env.NODE_ENV;
        delete process.env.STORAGE_DIR;
        delete process.env.AUTH_USERNAME;
        delete process.env.AUTH_PASSWORD;
    });

    beforeEach(() => {
        cleanTestDir();
    });

    it('GET non-existent file returns 404', async () => {
        const res = await request(app).get('/nofile.txt');
        expect(res.status).toBe(404);
    });

    it('POST creates a new file', async () => {
        const res = await request(app)
            .post('/foo.txt')
            .set('Authorization', AUTH_HEADER)
            .send('hello');
        expect(res.status).toBe(201);
        expect(fs.existsSync(path.join(TEST_STORAGE_DIR, 'foo.txt'))).toBe(true);
    });

    it('POST to existing file returns 409', async () => {
        fs.writeFileSync(path.join(TEST_STORAGE_DIR, 'bar.txt'), 'exists');
        const res = await request(app)
            .post('/bar.txt')
            .set('Authorization', AUTH_HEADER)
            .send('should fail');
        expect(res.status).toBe(409);
    });

    it('PUT creates or updates a file', async () => {
        const res = await request(app)
            .put('/baz.txt')
            .set('Authorization', AUTH_HEADER)
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', '11')
            .send(Buffer.from('new content'));
        expect(res.status).toBe(200);
        expect(fs.readFileSync(path.join(TEST_STORAGE_DIR, 'baz.txt')).toString()).toBe('new content');
    });

    it('DELETE removes a file', async () => {
        const filePath = path.join(TEST_STORAGE_DIR, 'delme.txt');
        fs.writeFileSync(filePath, 'bye');
        const res = await request(app)
            .delete('/delme.txt')
            .set('Authorization', AUTH_HEADER);
        expect(res.status).toBe(200);
        expect(fs.existsSync(filePath)).toBe(false);
    });

    it('GET directory returns file list', async () => {
        fs.mkdirSync(path.join(TEST_STORAGE_DIR, 'dir'), { recursive: true });
        fs.writeFileSync(path.join(TEST_STORAGE_DIR, 'dir', 'a.txt'), 'a');
        const res = await request(app).get('/dir');
        expect(res.status).toBe(200);
        expect(res.body.files).toContain('a.txt');
    });

    it('POST/PUT/DELETE require auth', async () => {
        let res = await request(app).post('/noauth.txt').send('x');
        expect(res.status).toBe(401);
        res = await request(app).put('/noauth.txt').send('x');
        expect(res.status).toBe(401);
        res = await request(app).delete('/noauth.txt');
        expect(res.status).toBe(401);
    });
});
