# WebStore - Static File Server

A lightweight Node.js HTTP server for static file storage and retrieval.

## Quick Setup

1. Install:
   ```bash
   npm install hyperdata-wstore
   ```

2. Start server:
   ```bash
   node server/WebStore.js
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
