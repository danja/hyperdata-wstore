// config.js - Configuration for WebStore server
export const config = {
    // Storage directory - can be overridden by environment variables
    storageDir: process.env.STORAGE_DIR || './storage',

    // Authentication credentials
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'password'
}