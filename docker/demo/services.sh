#!/bin/bash

mkdir -p /data/db 2>/dev/null
mongod --fork --logpath /var/log/mongod.log

service nginx restart
netopeer2-server
#uwsgi --http 127.0.0.1:5555 --http-websockets --master --wsgi-file /var/www/liberouter-gui/backend/wsgi.py --callable application --processes 4 --threads 2 --stats 127.0.0.1:9191 > tmp/uwsgi.log
python3 /var/www/liberouter-gui/backend

# Keep the container running
while [ 1 ]; do
  sleep 30
done