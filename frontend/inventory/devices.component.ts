/*
 * NETCONF servers Inventory
 */
import {Component, OnInit, Input} from '@angular/core';
import {Router} from '@angular/router';
import { NgbModal, NgbModalRef, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ViewChild } from '@angular/core';

import {Device} from './device';
import {DevicesService} from './devices.service'
import {SessionsService} from '../config/sessions.service'

import {SocketService} from 'app/services/socket.service';

enum ssh_hostcheck_status {
    SSH_SERVER_KNOWN_CHANGED = 2,
    SSH_SERVER_FOUND_OTHER = 3,
    SSH_SERVER_FILE_NOT_FOUND = 4,
    SSH_SERVER_NOT_KNOWN = 0
}

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
    hostcheck = null;
    opened: boolean = false;
    constructor(
        private devicesService: DevicesService,
        private sessionsService: SessionsService,
        public socketService: SocketService,
        public modalService: NgbModal,
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

    hostcheckAnswer(result: boolean) {
        this.socketService.send('hostcheck_result', {'id': this.hostcheck.id, 'result': result});
        delete this.hostcheck;
        this.opened = false;
    }

    connect(device: Device) {
        /* for backward compatibility */
        if (!device.name) {
            device.name = device.hostname + ":" + device.port;
        }
        this.socketService.listen('hostcheck').subscribe((message: any) => {
            this.hostcheck = message;
            switch(message['state']) {
            case ssh_hostcheck_status.SSH_SERVER_KNOWN_CHANGED:
                this.hostcheck['msg'] = "Server has changed.";
                break;
            case ssh_hostcheck_status.SSH_SERVER_NOT_KNOWN:
                this.hostcheck['msg'] = "Server not known.";
                break;
            }
            this.openModal();
        });
        this.sessionsService.connect(device).subscribe(result => {
            if (result['success']) {
                this.router.navigateByUrl('/netopeer/config');
            } else {
                delete this.hostcheck;
                this.err_msg = result['error-msg']
            }
        });
    }

    openModal() {
        if(!this.opened) {
            const modalRef = this.modalService.open(NgbdModalContent, {centered: true});
            this.opened = true;
            modalRef.componentInstance.hostcheck = this.hostcheck;
            modalRef.result.then((result) => {
                this.hostcheckAnswer(result);
            }, (reason) => {
                this.hostcheckAnswer(false);
            });
        }

    }

    ngOnInit(): void {
        this.getDevices();
    }
}

@Component({
    selector: 'ngbd-modal-content',
    template: `<div class="modal-header">
        <h4 *ngIf="hostcheck.msg" class="modal-title">{{hostcheck.msg}}</h4>
        <button type="button" class="close" aria-label="Close" (click)="activeModal.dismiss('Cross click')">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
    <div class="modal-body">
        <div>The authenticity of the host <span class="keyword">{{hostcheck.hostname}}</span> cannot be established.<br/>
            <span class="keyword">{{hostcheck.keytype}}</span> key fingerprint is <span class="keyword">{{hostcheck.hexa}}</span>.</div>
        <div>Are you sure you want to continue connecting?</div>
    </div>
    <div class="modal-footer">
        <button class="btn btn-light" (click)="activeModal.close(true)">yes</button> /
        <button class="btn btn-light" (click)="activeModal.close(false)">no</button>
    </div>`
})
export class NgbdModalContent {
    @Input() hostcheck;
    constructor(public activeModal: NgbActiveModal) { }
}