import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WStoreClient } from '../../client/wstore.js';

// Mock fetch globally
vi.mock('node-fetch', () => ({
    __esModule: true,
    default: vi.fn()
}));
import * as fetch from 'node-fetch';

// Mock fs
vi.mock('fs');

const FAKE_BASE_URL = 'http://localhost:4500/';
const FAKE_AUTH = 'user:pass';
const FAKE_REMOTE = 'files/test.txt';
const FAKE_LOCAL = '/tmp/test.txt';
const FAKE_BODY = Buffer.from('hello world');

function mockFetchResponse({ ok = true, status = 200, text = '', headers = {} } = {}) {
    return {
        ok,
        status,
        text: () => Promise.resolve(text),
        arrayBuffer: () => Promise.resolve(FAKE_BODY),
        headers: {
            entries: () => Object.entries(headers)
        }
    };
}

describe('WStoreClient', () => {
    let client;
    beforeEach(() => {
        client = new WStoreClient(FAKE_BASE_URL, FAKE_AUTH, {});
        vi.clearAllMocks();
    });

    it('should GET a file and write to disk', async () => {
        fetch.default.mockResolvedValueOnce(mockFetchResponse());
        fs.writeFileSync.mockImplementationOnce(() => { });
        fs.existsSync.mockReturnValueOnce(true);
        fs.mkdirSync.mockImplementationOnce(() => { });
        await client.get(FAKE_REMOTE, FAKE_LOCAL);
        expect(fetch.default).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should POST a file', async () => {
        fetch.default.mockResolvedValueOnce(mockFetchResponse());
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(FAKE_BODY);
        await client.post(FAKE_LOCAL, FAKE_REMOTE);
        expect(fetch.default).toHaveBeenCalled();
    });

    it('should PUT a file', async () => {
        fetch.default.mockResolvedValueOnce(mockFetchResponse());
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(FAKE_BODY);
        await client.put(FAKE_LOCAL, FAKE_REMOTE);
        expect(fetch.default).toHaveBeenCalled();
    });

    it('should DELETE a file', async () => {
        fetch.default.mockResolvedValueOnce(mockFetchResponse());
        await client.delete(FAKE_REMOTE);
        expect(fetch.default).toHaveBeenCalled();
    });

    it('should handle GET error', async () => {
        fetch.default.mockResolvedValueOnce(mockFetchResponse({ ok: false, status: 404, text: 'Not found' }));
        await expect(client.get(FAKE_REMOTE, FAKE_LOCAL)).rejects.toThrow();
    });

    it('should handle POST error if file missing', async () => {
        fs.existsSync.mockReturnValueOnce(false);
        await expect(client.post(FAKE_LOCAL, FAKE_REMOTE)).rejects.toThrow();
    });

    it('should add auth header for write operations', async () => {
        fetch.default.mockResolvedValue(mockFetchResponse());
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(FAKE_BODY);
        await client.put(FAKE_LOCAL, FAKE_REMOTE);
        const call = fetch.default.mock.calls[0];
        expect(call[1].headers['Authorization']).toMatch(/^Basic/);
    });
});
