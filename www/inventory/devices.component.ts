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
    styleUrls: ['../netopeer.css', './inventory.component.css'],
    providers: [DevicesService]
})

export class InventoryDevicesComponent implements OnInit {
    devices: Device[];
    addingDevice = false;
    addingResult = -1;
    validHost = false;
    validPort = true; /* it has default value */
    newDevice: Device;
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
            this.checkHost(this.newDevice.hostname);
            this.checkPort(this.newDevice.port);
        } else {
            this.newDevice = null;
        }

        this.addingDevice = !this.addingDevice;
        this.addingResult = -1;
    }

    addDevice(action: string) {
        /* upload the schema file to the server, if success the schema list is refreshed */
        this.devicesService.addDevice(this.newDevice).subscribe(
            result => {this.addingResult = result['success'] ? 1 : 0; this.getDevices()});
    }

    rmDevice(device: Device) {
        this.devicesService.rmDevice(device.id).subscribe(
            result => {if (result['success']) {this.getDevices()} });
    }

    checkHost(host: string) {
        if (!host || !host.trim().length) {
            this.validHost = false;
        } else {
            this.validHost = true;
        }
    }

    checkPort(port: number): void {
        if (!port || port == 0 || port > 65535) {
            this.validPort = false;
        } else {
            this.validPort = true;
        }
    }

    connect(device: Device) {
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