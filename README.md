# netconf-gui
A GUI for the libnetconf2 library. Web-based NETCONF management tool.

**This project is a demo of the capabilities of the libnetconf2 libraries!**
As such, we will not provide full support for this project. You may still open issues, but a response is not guaranteed.

## Docker
You can use Docker to try the demo. Navigate to the docker folder and follow the instructions from the README file there.
Only Docker is required to run the demo. Other dependencies are installed automatically.

**We recommend using Docker over local installation** to prevent installation issues.


## Installation on a local machine

To install the NetconfGUI, follow these steps:

1. Follow the instructions in the [libyang repository](https://github.com/CESNET/libyang) and install libyang.
2. Follow the instructions in the [libnetconf2 repository](https://github.com/CESNET/libnetconf2) and install libnetconf2 with python bindings (Option `-DENABLE_PYTHON=on` when using cmake)
3. Follow the quick start guide in the [liberouter GUI repository](https://github.com/CESNET/liberouter-gui). On step two, copy the NetconfGUI repository to liberouter GUI `modules` folder.
4. Navigate to `modules/Netopeer2GUI/frontend` and run `npm run build:tools` to build plugins.
5. Start the Liberouter GUI and navigate to `http://localhost:4200` in your browser

