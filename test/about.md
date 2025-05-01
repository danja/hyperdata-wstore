## Pass

npm test -- test/e2e/simple.spec.js
npm test -- test/server/simple.spec.js
npm test -- test/client/simple.spec.js
npm test -- test/server/WebStore.unit.spec.js
npm test -- test/server/WebStore.integration.spec.js
npm test -- test/client/wstore.unit.spec.js

# Fail

npm test -- test/e2e/e2e-core.spec.js #  post, get, delete
npm test -- test/client/wstore.integration.spec.js # Claude
npm test -- test/e2e/e2e.spec.js # Claude

