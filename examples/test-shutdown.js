import http from 'http'

// Using default credentials from .env.example
const USERNAME = 'admin'
const PASSWORD = 'password'

const options = {
    hostname: 'localhost',
    port: 4500,
    path: '/shutdown',
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'),
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength('STOP WEBSTORE')
    }
}

const req = http.request(options, (res) => {
    let data = ''
    
    res.on('data', (chunk) => {
        data += chunk
    })
    
    res.on('end', () => {
        console.log('Server response:', data)
    })
})

req.on('error', (error) => {
    console.error('Error:', error.message)
})

const body = 'STOP WEBSTORE'
req.write(body)
req.end()
