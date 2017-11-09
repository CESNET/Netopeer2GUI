Netopeer2GUI in Vagrant
=======================

The Vagrantfiles here are used for development deployment of the Netopeer2GUI.
The source files of the Netopeer2GUI are linked (shared) into Vagrant from the
local directory (../) so do not move the Vagrantfiles outside this location.
This make possible to do changes of the source files locally while the effect
is immediately reflected in Vagrant image.

Requirements
------------

- [Virtualbox](https://www.virtualbox.org/wiki/Downloads)
- [Vagrant](http://www.vagrantup.com/downloads.html)

Running Netopeer2GUI in Vagrant
-------------------------------

This directory contains prepared configuration (Vagrantfile) with several Linux
distros. After choosing the system, go into the selected directory and start
Vagrant:
```
$ vagrant up
```
The Installation process is started and may take some time (by subsequent
`vagrant up commands, the installation process is skipped and the previously
installed virtual machine is just started). Besides the GUI, it installs also
an example NETCONF server (Netopeer2 with sysrepo) where you can connect with
the Netopeer2GUI. As well as the Netopeer2GUI server, the NETCONF server is
available from the Vagrant host. The ports are not static to avoid collisions
with the currently used ports, so when Vagrant is ready, you are supposed to
get the information about ports mapping:
```
$ vagrant port
The forwarded ports for the machine are listed below. Please note that
these values may differ from values configured in the Vagrantfile if the
provider supports automatic port collision detection and resolution.

    22 (guest) => 2203 (host)
  4200 (guest) => 2201 (host)
   830 (guest) => 2202 (host)
```
In this case, the NETCONF server is available from the host on port 2202
and Netopeer2GUI is available on the following address from your browser:
```
http://localhost:2201
```
When you first open the address, there is no user set, so you can use
any credential but when pushing the `Login` button, you will be redirected
to the setup page to create a new user.

Usefull Vagrant commands
------------------------
- stop the virtual machine
```
$ vagrant halt
```
- restart the virtual machine
```
$ vagrant reload
```
- connect to the virtual machine via SSH
```
$ vagrant ssh
```

