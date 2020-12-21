# netconf-gui
A GUI for the libnetconf2 library.
**This version is in development and NOT for production use yet!**
We are unable to provide full support right now for this version since some parts are not yet finished.

## Installation

To install the NetconfGUI, follow these steps:

1. Follow the instructions in the [libyang repository](https://github.com/CESNET/libyang) and install libyang.
2. Follow the instructions in the [libnetconf2 repository](https://github.com/CESNET/libnetconf2) and install libnetconf2 with python bindings (Option `-DENABLE_PYTHON=on` when using cmake)
3. Follow the quick start guide in the [liberouter GUI repository](https://github.com/CESNET/liberouter-gui). On step two, copy the NetconfGUI repository to liberouter GUI `modules` folder.
4. Start the liberouter GUI and navigate to `http://localhost:4200` in your browser


## Docker
Comming soon.


## Vagrant
To try out the NetconfGUI without installing it, clone this repository, install [VirtualBox](https://www.virtualbox.org/wiki/Downloads) and [Vagrant](https://www.vagrantup.com/docs/installation/)), navigate to the `vagrant` folder in this repository and type `vargant up`.

This will bring up a virtual machine and install all dependencies automatically. The virtual machine also contains running `netopeer2-server` as a NETCONF enabled device.
You can connect to this device using the following credentials:
- Username: vagrant
- Password: vagrant
- Hostname: localhost
- Port: 830

To stop the virtual machine, use the `vagrang halt` command. To connect to the virtual machine, use `vagrant ssh`.

You can connect to the GUI in the virtual machine just as if it was running on your machine. Just type `vagrant port` to check, which port in your system is the port 4200 from the virtual machine mapped to.

```
$ vagrant port
The forwarded ports for the machine are listed below. Please note that
these values may differ from values configured in the Vagrantfile if the
provider supports automatic port collision detection and resolution.

    22 (guest) => 2203 (host)
  4200 (guest) => 2201 (host)
   830 (guest) => 2202 (host)
```
