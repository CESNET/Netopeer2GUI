# Docker images

## Demo
- **For testing purposes only**
- Contains a running virtual netconf device (netopeer2server)
- Go to the `demo` folder, then type `docker build -t netopeer2gui .`, 
  after it finishes, type `docker run -dp 80:80 netopeer2gui` 
  and navigate to `http://localhost` in your browser.
- You can connect to the demo netconf device from the user interface using these credentials:
```
host: localhost
port: 830
username: root
password: docker
```
