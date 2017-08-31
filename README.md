# Netopeer2GUI
Web-based NETCONF management center

# Dependencies
The application is created as a module to the CESNET/liberouter-gui framework.

# Notes

## Install
```
$ git clone --branch devel --recursive https://github.com/CESNET/liberouter-gui
$ cd liberouter-gui/modules
$ git clone https://github.com/CESNET/Netopeer2GUI
$ cd ..
$ ln -s ../../../modules/Netopeer2GUI/api ./api/liberouterapi/modules/netopeer
$ ln -s ../../../../modules/Netopeer2GUI/www/ ./www/src/app/modules/netopeer

Add following lines into liberouter-gui/www/src/app/modules.ts:
import { NetopeerModule } from './modules/netopeer/netopeer.module';
export const modules: Array<Object> = [
    ...
    NetopeerModule
```

## Database (users storage for liberouter-gui)
```
$ mongod --nojournal
```
## Backend
```
$ cd liberouter-gui
$ cp api/config-sample.in api/config.ini
$ virtualenv --system-site-packages venv
$ source venv/bin/activate
$ pip3 install -r api/requirements.txt
$ python3 api/
```
## Frontend
```
$ cd liberouter-gui/www
# npm install
# npm install -g @angular/cli
# npm install -g typescript

Modify proxy.json:

"/libapi": {
    "target": "http://localhost:5555/",
    "secure": false,
    "pathRewrite": {"/libapi": ""}
}

$ ng serve --host localhost --proxy proxy.json
(touch any .ts file to run ng again and go over an error)
```
