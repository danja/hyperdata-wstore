#!/bin/bash
# Start both the WStore server and the form server (now in demo/)

# Start WStore server in background
node server/WebStore.js &
WSTORE_PID=$!

# Wait a moment to ensure WStore is up
sleep 2

# Start form server from demo/ (will use WStore at localhost:4500)
node demo/form-server.js &
FORM_PID=$!

echo "WStore server PID: $WSTORE_PID"
echo "Form server PID: $FORM_PID"
echo "Both servers are running."
echo "- WStore: http://localhost:4500/"
echo "- Form:   http://localhost:3000/"

echo "Press Ctrl+C to stop both."

# Wait for both to exit
wait $WSTORE_PID $FORM_PID
