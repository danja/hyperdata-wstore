import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'loglevel';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.setLevel('debug');

const app = express();
const upload = multer({ dest: 'uploads/' });
const WSTORE_URL = process.env.WSTORE_URL || 'http://localhost:4500/';

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    log.info('GET / - Serving upload form');
    res.send(`
    <h1>Upload Markdown to WStore</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="markdown" accept=".md,.markdown,text/markdown" required />
      <input type="text" name="remotePath" placeholder="Remote path (e.g. files/mydoc.md)" value="files/demo.md" required />
      <input type="text" name="auth" placeholder="Auth (username:password)" value="testuser:testpass" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

app.post('/upload', upload.single('markdown'), async (req, res) => {
    log.info('POST /upload - Received upload request');
    log.debug('Request body:', req.body);
    log.debug('File info:', req.file);
    if (!req.file || !req.body.remotePath || !req.body.auth) {
        log.warn('Missing file, remotePath, or auth');
        return res.status(400).send('File, remote path, and auth required.');
    }
    const fs = await import('fs');
    const fileContent = fs.readFileSync(req.file.path);
    const authHeader = 'Basic ' + Buffer.from(req.body.auth).toString('base64');
    log.debug('Auth header:', authHeader);
    try {
        log.info(`Uploading to WStore: ${new URL(req.body.remotePath, WSTORE_URL).toString()}`);
        const response = await fetch(new URL(req.body.remotePath, WSTORE_URL).toString(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Authorization': authHeader,
            },
            body: fileContent
        });
        log.debug('WStore response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            log.error('WStore error:', response.status, errorText);
            throw new Error(`WStore error: ${response.status} ${errorText}`);
        }
        log.info('File uploaded to WStore!');
        res.send('File uploaded to WStore!');
    } catch (err) {
        log.error('Upload failed:', err.message);
        res.status(500).send('Upload failed: ' + err.message);
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Form server running at http://localhost:${PORT}`);
});
