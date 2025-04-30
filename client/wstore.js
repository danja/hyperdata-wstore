#!/usr/bin/env node
// wstore.js - Command-line client for WebStore server

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import mime from 'mime-types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class WStoreClient {
    constructor(baseUrl, auth = null, options = {}) {
        this.baseUrl = baseUrl
        this.auth = auth
        this.options = options
    }

    async get(remoteFilePath, localFilePath) {
        const url = new URL(remoteFilePath, this.baseUrl)

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this._getHeaders('GET')
            })

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
            }

            // If include headers option is set, display response headers
            if (this.options.include) {
                console.log('HTTP Response Headers:')
                for (const [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`)
                }
                console.log() // Empty line after headers
            }

            // Handle output based on options and arguments
            const outputFile = this.options.output || localFilePath

            if (outputFile) {
                // Ensure directory exists
                const dir = path.dirname(outputFile)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }

                // Save file
                const buffer = await response.buffer()
                fs.writeFileSync(outputFile, buffer)
                console.log(`File saved to ${outputFile}`)
            } else {
                // Display content if no output file specified
                const content = await response.text()
                console.log(content)
            }
        } catch (error) {
            console.error(`Error getting file: ${error.message}`)
            process.exit(1)
        }
    }

    async post(localFilePath, remoteFilePath) {
        return this._sendFile('POST', localFilePath, remoteFilePath)
    }

    async put(localFilePath, remoteFilePath) {
        return this._sendFile('PUT', localFilePath, remoteFilePath)
    }

    async delete(remoteFilePath) {
        const url = new URL(remoteFilePath, this.baseUrl)

        try {
            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers: this._getHeaders('DELETE')
            })

            // If include headers option is set, display response headers
            if (this.options.include) {
                console.log('HTTP Response Headers:')
                for (const [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`)
                }
                console.log() // Empty line after headers
            }

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
            }

            const responseText = await response.text()

            if (this.options.output) {
                // Write the response to the output file
                fs.writeFileSync(this.options.output, responseText)
                console.log(`Response saved to ${this.options.output}`)
            } else {
                console.log(`File ${remoteFilePath} deleted successfully`)
            }
        } catch (error) {
            console.error(`Error deleting file: ${error.message}`)
            process.exit(1)
        }
    }

    async _sendFile(method, localFilePath, remoteFilePath) {
        if (!fs.existsSync(localFilePath)) {
            console.error(`Local file ${localFilePath} not found`)
            process.exit(1)
        }

        const url = new URL(remoteFilePath, this.baseUrl)
        // Use octet-stream to prevent automatic JSON parsing
        const contentType = 'application/octet-stream'
        const fileContent = fs.readFileSync(localFilePath)

        try {
            const response = await fetch(url.toString(), {
                method,
                headers: {
                    ...this._getHeaders(method),
                    'Content-Type': contentType
                },
                body: fileContent
            })

            // If include headers option is set, display response headers
            if (this.options.include) {
                console.log('HTTP Response Headers:')
                for (const [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`)
                }
                console.log() // Empty line after headers
            }

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`)
            }

            const responseText = await response.text()

            if (this.options.output) {
                // Write the response to the output file
                fs.writeFileSync(this.options.output, responseText)
                console.log(`Response saved to ${this.options.output}`)
            } else {
                console.log(`File ${localFilePath} ${method === 'POST' ? 'created' : 'updated'} successfully at ${remoteFilePath}`)
            }
        } catch (error) {
            console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} file: ${error.message}`)
            process.exit(1)
        }
    }

    _getHeaders(method) {
        const headers = {}

        // Add auth header for write operations
        if (this.auth && (method === 'PUT' || method === 'POST' || method === 'DELETE')) {
            const base64Auth = Buffer.from(this.auth).toString('base64')
            headers['Authorization'] = `Basic ${base64Auth}`
        }

        return headers
    }
}

// Parse command line arguments
yargs(hideBin(process.argv))
    .scriptName('wstore')
    .usage('$0 <cmd> [args]')
    .env('WSTORE')
    .option('baseUrl', {
        alias: 'b',
        description: 'Base URL for the WebStore server',
        type: 'string',
        default: 'http://localhost:4500/'
    })
    .option('auth', {
        alias: 'a',
        description: 'Basic auth credentials in format username:password',
        type: 'string'
    })
    .option('include', {
        alias: 'i',
        description: 'Include protocol response headers in the output',
        type: 'boolean',
        default: false
    })
    .option('output', {
        alias: 'o',
        description: 'Write to file instead of stdout',
        type: 'string'
    })
    .command('get <remote> [local]', 'Download a file from the server',
        (yargs) => {
            yargs
                .positional('remote', {
                    describe: 'Remote file path',
                    type: 'string'
                })
                .positional('local', {
                    describe: 'Local file path to save the downloaded file',
                    type: 'string'
                })
        },
        (argv) => {
            const client = new WStoreClient(argv.baseUrl, argv.auth, {
                include: argv.include,
                output: argv.output
            })
            client.get(argv.remote, argv.local)
        }
    )
    .command('post <local> <remote>', 'Create a new file on the server',
        (yargs) => {
            yargs
                .positional('local', {
                    describe: 'Local file path to upload',
                    type: 'string'
                })
                .positional('remote', {
                    describe: 'Remote file path to create',
                    type: 'string'
                })
        },
        (argv) => {
            const client = new WStoreClient(argv.baseUrl, argv.auth, {
                include: argv.include,
                output: argv.output
            })
            client.post(argv.local, argv.remote)
        }
    )
    .command('put <local> <remote>', 'Create or update a file on the server',
        (yargs) => {
            yargs
                .positional('local', {
                    describe: 'Local file path to upload',
                    type: 'string'
                })
                .positional('remote', {
                    describe: 'Remote file path to update',
                    type: 'string'
                })
        },
        (argv) => {
            const client = new WStoreClient(argv.baseUrl, argv.auth, {
                include: argv.include,
                output: argv.output
            })
            client.put(argv.local, argv.remote)
        }
    )
    .command('delete <remote>', 'Delete a file from the server',
        (yargs) => {
            yargs
                .positional('remote', {
                    describe: 'Remote file path to delete',
                    type: 'string'
                })
        },
        (argv) => {
            const client = new WStoreClient(argv.baseUrl, argv.auth, {
                include: argv.include,
                output: argv.output
            })
            client.delete(argv.remote)
        }
    )
    .example('$0 get files/image.jpg ./downloads/image.jpg', 'Download a file')
    .example('$0 put ./local/doc.pdf files/doc.pdf', 'Upload a file')
    .example('$0 delete files/oldfile.txt', 'Delete a file')
    .example('$0 --baseUrl=http://example.com/files --auth=user:pass get image.jpg', 'Use custom server and auth')
    .example('$0 get -i files/config.json', 'Get a file and show response headers')
    .example('$0 get files/data.json -o ./output.json', 'Get a file and save to specific output location')
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .alias('help', 'h')
    .argv