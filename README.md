# Netopeer2GUI

Web-based NETCONF management center

This tool is currently under development and not intended for production use.
However, we welcome your feedback provided via the [issue tracker](https://github.com/CESNET/Netopeer2GUI/issues).

![Netopeer2GUI schema](./schema.svg)

## Features List

- [x] manage devices to connect to
  - [ ] manage devices groupings for bulk configuration
- [x] manage YANG schemas stored in GUI to represent received data
  - [ ] interaction with user by asking unknown module used by the connected device
- [x] display configuration and data of the connected device (data tree view)
- [ ] edit configuration data of the device
- [ ] bulk configuration (set configuration of multiple device at once)
- [ ] YANG explorer to display/browse YANG schema
- [ ] receive NETCONF notifications and present them to user
- [ ] accept NETCONF Call Home connections
- [ ] plugin interface for schema=specific applications

## Dependencies

The application is created as a module to the [liberouter-gui](https://github.com/CESNET/liberouter-gui)
framework, so to install it, follow the [liberouter-gui instructions](https://github.com/CESNET/liberouter-gui/wiki/Deploying-LiberouterGUI).

The backend is a Flask server written in Python 3 and utilizing [libyang](https://github.com/CESNET/libyang)
and [libnetconf2](https://github.com/CESNET/libnetconf2) Python bindings.
Unfortunatelly, the code of the bindings is not yet finished, so please use
the devel branches of the mentioned libraries:

```bash
git clone -b devel https://github.com/CESNET/libyang
mkdir -p libyang/build && cd libyang/build
cmake -DGEN_LANGUAGE_BINDINGS=ON ..
make
make install
```

```bash
git clone -b devel https://github.com/CESNET/libnetconf2
mkdir -p libnetconf2/build && cd libnetconf2/build
cmake -DENABLE_PYTHON=ON ..
make
make install
```

## Vagrant

For fast and simple testing/development deployment, you can use the prepared
Vagrantfiles for instantiating virtual machine. More information can be found
[here](./vagrant/).

## Docker

```bash
docker build -t netopeer2-gui .
docker run -d --rm -p 4200:4200 --name netopeer2-gui netopeer2-gui
# Start a netconf server also
docker run -d --rm --name sysrepo -p 830:830 sysrepo/sysrepo-netopeer2:latest
# Capture IP of container:
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sysrepo
```

Connect to web client [localhost:4200](localhost:4200)
Login, then add device:
  - IP of sysrepo container: netconf/netconf

## Docker-compose

```bash
docker build -t netopeer2-gui .
docker-compose up
```

Connect to web client [localhost:4200](localhost:4200)
Login, then add device:
  - sysrepo:netconf/netconf

```bash
docker-compose down
```
