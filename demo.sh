cd client

BASE_URL="http://localhost:4500/"
AUTH="admin:password"

./wstore.js --baseUrl=$BASE_URL --auth=$AUTH post ./hello.json tests/hello.json

# File ./hello.json created successfully at tests/hello.json

./wstore.js -i get tests/hello.json

# content-type: application/json

# { "hello" : "world" }

./wstore.js -i --auth=$AUTH delete tests/hello.json

# File tests/hello.json deleted successfully

./wstore.js get tests/hello.json

# 404, Message: File not found
