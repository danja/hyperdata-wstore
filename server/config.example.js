// config.js - Configuration for WebStore server
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = {
    // Storage directory - can be overridden by environment variables
    storageDir: process.env.STORAGE_DIR || path.join(__dirname, 'storage'),

    // Authentication credentials
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'password'
}