![Node.js CI](https://github.com/danja/wstore/actions/workflows/ci.yml/badge.svg)

# hyperdata-wstore

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/danja/hyperdata-wstore)

A cheap & cheerful Node.js HTTP server and minimal companion clients for **file storage** and **retrieval**.

Supports HTTP GET, POST, PUT, DELETE ([RFC 9112](https://www.rfc-editor.org/rfc/rfc9112)) with HTTP Basic ([RFC 7617](https://www.rfc-editor.org/rfc/rfc7617)) authentication. Includes example nginx config for proxying (you will want the server to do HTTPS for bare minimum acceptable security).

## Use from source

To use the repository directly:

1. Clone the repository:

```bash
git clone https://github.com/danja/wstore.git
```

2. Install dependencies:

```bash
cd wstore
npm install
```

3. Create a `.env` file in the project root with configuration:

```env
PORT=4500
STORAGE_DIR=./storage
AUTH_USERNAME=admin
AUTH_PASSWORD=password
```

4. Start the server:

```bash
node server/WebStore.js
```

The repository includes additional features and examples that may not be available in the npm package.


## Use as a library

Install the package using npm:

```bash
npm install hyperdata-wstore
```

1. Create a `.env` file in your project root with configuration:

```env
PORT=4500
STORAGE_DIR=./storage
AUTH_USERNAME=admin
AUTH_PASSWORD=password
```

2. Create a server file (e.g., `server.js`):


```javascript
import WebStore from 'hyperdata-wstore'

// Optionally override configuration
// process.env.PORT = '4500'
// process.env.STORAGE_DIR = './storage'
// process.env.AUTH_USERNAME = 'admin'
// process.env.AUTH_PASSWORD = 'password'

// Start the server
const server = WebStore.listen(config.port, config.host, () => {
    console.log(`WebStore server running at http://${config.host}:${config.port}`)
    console.log(`Storage directory: ${config.storageDir}`)
    console.log(`Authentication: ${config.auth.username}/${config.auth.password}`)
})

export { server }
```

3. Run your server:

```bash
node server.js
```

## Configuration

The WebStore server can be configured using environment variables. The package will automatically load a `.env` file from your project root directory.

Available configuration options:

```env
# Server configuration
PORT=4500         # Port to listen on
HOST=localhost    # Host to bind to

# Storage directory (relative to project root)
STORAGE_DIR=storage

# Authentication credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=password

# Logging configuration
LOG_LEVEL=info    # loglevel severity: trace, debug, info, warn, error, silent

# Optional: Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webstore
DB_USER=webstore
DB_PASSWORD=webstore
```

## CLI Usage

The package also provides a command-line interface:

```bash
# Start the server
hyperdata-wstore

# Start with custom configuration
PORT=4500 hyperdata-wstore
```

## Quick Setup

1. Install:
   ```bash
   npm install hyperdata-wstore
   ```

2. Start server:
   ```bash
   npm start
   ```

3. Store files:
   ```bash
   curl -u admin:password -X POST -H "Content-Type: application/json" \
     -d '{"hello": "world"}' http://localhost:4500/hello.json
   ```

4. Retrieve files:
   ```bash
   curl http://localhost:4500/hello.json
   ```

## Configuration

Set these environment variables:

- `STORAGE_DIR`: Directory to store files (defaults to `./storage`)
- `PORT`: Port number to listen on (defaults to 4500)
- `AUTH_USERNAME`: Username for write operations
- `AUTH_PASSWORD`: Password for write operations

## Security

- Always run behind HTTPS
- Use strong credentials
- Consider rate limiting
- Monitor access logs

## Supported Operations

- `GET`: Retrieve files or list directories
- `POST`: Create new files (fails if exists)
- `PUT`: Create or update files
- `DELETE`: Remove files

## Production Setup

1. Use a reverse proxy (e.g., nginx) for HTTPS
2. Set up proper logging
3. Configure timeouts
4. Add caching headers

There are more detailed notes in [README-long.md](README-long.md).