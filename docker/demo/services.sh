#!/bin/bash

mkdir -p /data/db 2>/dev/null
mongod --fork --logpath /var/log/mongod.log

service apache2 restart
netopeer2-server

# Keep the container running
while [ 1 ]; do
  sleep 30
done