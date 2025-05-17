// config.js - Configuration for WebStore server
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to load .env file from multiple locations
const envPaths = [
    path.join(__dirname, '../.env'),      // Project root
    path.join(__dirname, '.env'),         // Server directory
    path.join(process.cwd(), '.env')      // Current working directory
]

for (const envPath of envPaths) {
    try {
        dotenv.config({ path: envPath })
        console.log(`Loaded environment variables from ${envPath}`)
        break
    } catch (error) {
        console.log(`No .env file found at ${envPath}`)
    }
}

// Configuration with fallbacks
export const config = {
    // Server configuration
    port: parseInt(process.env.PORT) || 4500,
    host: process.env.HOST || 'localhost',

    // Storage directory (relative to project root)
    storageDir: path.resolve(process.env.STORAGE_DIR || 'storage'),

    // Authentication
    auth: {
        username: process.env.AUTH_USERNAME || 'admin',
        password: process.env.AUTH_PASSWORD || 'password'
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // Optional database configuration
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
}

// Validate required configurations
if (!config.storageDir) {
    throw new Error('Storage directory must be configured')
}

// Ensure storage directory exists
try {
    await fs.promises.access(config.storageDir)
} catch (error) {
    console.log(`Creating storage directory at ${config.storageDir}`)
    await fs.promises.mkdir(config.storageDir, { recursive: true })
}