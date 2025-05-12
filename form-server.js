import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const WSTORE_URL = process.env.WSTORE_URL || 'http://localhost:4500/';

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send(`
    <h1>Upload Markdown to WStore</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="markdown" accept=".md,.markdown,text/markdown" required />
      <input type="text" name="remotePath" placeholder="Remote path (e.g. files/mydoc.md)" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

app.post('/upload', upload.single('markdown'), async (req, res) => {
    if (!req.file || !req.body.remotePath) {
        return res.status(400).send('File and remote path required.');
    }
    const fs = await import('fs');
    const fileContent = fs.readFileSync(req.file.path);
    try {
        const response = await fetch(new URL(req.body.remotePath, WSTORE_URL).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: fileContent
        });
        if (!response.ok) {
            throw new Error(`WStore error: ${response.status} ${await response.text()}`);
        }
        res.send('File uploaded to WStore!');
    } catch (err) {
        res.status(500).send('Upload failed: ' + err.message);
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Form server running at http://localhost:${PORT}`);
});
