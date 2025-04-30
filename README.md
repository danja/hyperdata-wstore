# wstore

A simple Node.js HTTP server and command-line client for file storage and retrieval.

## Project Structure

```
webstore-project/
│
├── server/                      # Server application
│   ├── package.json             # Server dependencies
│   ├── WebStore.js              # Main server application
│   ├── config.js                # Server configuration
│   └── storage/                 # Default storage directory (created by the app)
│
├── client/                      # Command line client
│   ├── package.json             # Client dependencies
│   └── wstore.js                # Client application
│
└── nginx/                       # NGINX configuration (for reference during dev)
    └── webstorage.conf          # Will be moved to /etc/nginx/sites-available/ in production
```

## Development Setup

### Server Setup

Copy `server/config.example.js` to `server/config.js`, add desired credentials

```bash
cd webstore-project/server
npm install
node WebStore.js
```

### Client Setup

```bash
cd webstore-project/client
npm install
chmod +x wstore.js

# Test with:
./wstore.js --baseUrl=http://localhost:4500/ get hello.txt
```

## Production Deployment

1. Copy the server directory to your server location
2. Copy the nginx configuration to `/etc/nginx/sites-available/`
3. Create a symbolic link:
   ```bash
   ln -s /etc/nginx/sites-available/webstorage.conf /etc/nginx/sites-enabled/
   ```
4. Test new nginx config : `sudo nginx -t`
5. Restart nginx : `sudo systemctl nginx restart`
6. Update configuration in `config.js` or set environment variables for production settings
7. Install the client globally with `npm install -g` from the client directory or use it directly

## Server Features

- HTTP methods: GET, POST, PUT, DELETE
- HTTP Basic authentication for write operations (PUT, POST, DELETE)
- Content/media type handling based on file extensions
- Runs on port 4500

## Client Features

- Object-oriented command-line interface using yargs
- Support for GET, POST, PUT, DELETE operations
- Maps between local files and server resources
- Authentication support
