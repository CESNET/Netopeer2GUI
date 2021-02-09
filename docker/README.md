# Docker images

## Demo
- For testing purposes
- Contains a running virtual netconf device (netopeer2server)
- Go to the `demo` folder, then type `docker build -t netopeer2gui .`, after it finishes, type `docker run -dp 80:80 netopeer2gui` and go to `http://localhost` in your browser.
- You can connect to a device using these credentials:
```
host: localhost
port: 830
username: root
password: docker
```

## Production
- Comming soon