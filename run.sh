echo "Starting server..."
nohup python app.py > flask.log 2>&1 &
APP_PID=$!

cd ./web/dist
echo "Starting web server..."
nohup python -m http.server 5173 > web.log 2>&1 &

wait $APP_PID