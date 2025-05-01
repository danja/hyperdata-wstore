## Pass

npm test -- test/simple.spec.js
npm test -- server/test/simple.spec.js
npm test -- client/test/simple.spec.js
npm test -- server/test/WebStore.unit.spec.js
npm test -- server/test/WebStore.integration.spec.js

# Fail


npm test -- client/test/wstore.unit.spec.js
npm test -- client/test/wstore.integration.spec.js
npm test -- test/e2e.spec.js

BASE_URL="http://localhost:4500/"
AUTH="admin:password"

./wstore.js --baseUrl=$BASE_URL --auth=$AUTH post ./hello.json tests/hello.json

# File ./hello.json created successfully at tests/hello.json

./wstore.js -i get tests/hello.json

# HTTP Response Headers:

# content-type: application/json

# ...

# { "hello" : "world" }

./wstore.js -h

# // see for yourself

./wstore.js -i --auth=$AUTH delete tests/hello.json
