import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Simple Test', () => {
    it('should be able to run', () => {
        expect(true).toBe(true);
    });

    it('should be able to access the filesystem', () => {
        const testPath = path.join(__dirname, 'simple.spec.js');
        expect(fs.existsSync(testPath)).toBe(true);
    });
});
