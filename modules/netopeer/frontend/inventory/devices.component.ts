/*
 * NETCONF servers Inventory
 */
import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

import {Device} from './device';
import {DevicesService} from './devices.service'
import {SessionsService} from '../config/sessions.service'

@Component({
    selector: 'inventoryDevices',
    templateUrl: './devices.component.html',
    styleUrls: ['./inventory.component.scss'],
    providers: [DevicesService]
})

export class InventoryDevicesComponent implements OnInit {
    devices: Device[];
    addingDevice = false;
    addingResult = -1;
    validAddForm = 1; /* 1 - port (has default value), 2 - password, 4 - username, 8 - hostname */
    newDevice: Device;
    namePlaceholder: string = "";
    id: number;
    err_msg = "";

    constructor(
        private devicesService: DevicesService,
        private sessionsService: SessionsService,
        private router: Router) {}

    getDevices(): void {
        this.devicesService.getDevices().subscribe(devices => {
            this.devices = devices;
            if (devices.length) {
                this.id = devices[devices.length - 1].id + 1;
            } else {
                this.id = 1;
            }
        });
    }

    showAddDevice(): void {
        if (!this.addingDevice) {
            this.newDevice = new Device(this.id);
            this.checkString(this.newDevice.hostname, 8);
            this.checkString(this.newDevice.username, 4);
            this.checkString(this.newDevice.password, 2);
            this.checkPort(this.newDevice.port);
        } else {
            this.newDevice = null;
        }

        this.addingDevice = !this.addingDevice;
        this.addingResult = -1;
    }

    addDevice(action: string) {
        if (!this.newDevice.name) {
            this.newDevice.name = this.namePlaceholder;
        }
        if (action == 'store' || action == 'store_connect') {
            this.devicesService.addDevice(this.newDevice).subscribe(
                result => {this.addingResult = result['success'] ? 1 : 0;
                this.getDevices();
                if (action == 'store_connect') {
                    this.connect(this.newDevice);
                }
            });
        } else { /* connect only */
            this.newDevice.id = 0;
            this.connect(this.newDevice);
            this.newDevice.id = this.id;
        }
    }

    rmDevice(device: Device) {
        this.devicesService.rmDevice(device.id).subscribe(
            result => {if (result['success']) {this.getDevices()} });
    }

    namePlaceholderUpdate() {
        this.namePlaceholder = this.newDevice.hostname + ':' + this.newDevice.port;
    }

    checkString(host: string, item: number) {
        if (!host || !host.trim().length) {
            this.validAddForm &= ~item;
        } else {
            this.validAddForm |= item;
        }
    }

    checkPort(port: number): void {
        if (!port || port == 0 || port > 65535) {
            this.validAddForm &= ~1;
        } else {
            this.validAddForm |= 1;
        }
        this.namePlaceholderUpdate();
    }

    bitStatus(bit: number): boolean {
        if (this.validAddForm & bit) {
            return true;
        } else {
            return false;
        }
    }

    connect(device: Device) {
        /* for backward compatibility */
        if (!device.name) {
            device.name = device.hostname + ":" + device.port;
        }
        this.sessionsService.connect(device).subscribe(result => {
            if (result['success']) {
                this.router.navigateByUrl('/netopeer/config');
            } else {
                this.err_msg = result['error-msg']
            }
        });
    }

    ngOnInit(): void {
        this.getDevices();
    }
}