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
    addingDeviceLabel = "Add";
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
            this.addingDeviceLabel = "Cancel";
        } else {
            this.newDevice = null;
            this.addingDeviceLabel = "Add";
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

    socketAnswer(event: string, id:string, item: string, value: any, item2: string = null, value2: any = null) {
        let data = {'id': id};
        data[item] = value;
        if (item2) {
            data[item2] = value2
        }
        this.socketService.send(event, data);
    }

    connect(device: Device) {
        /* for backward compatibility */
        if (!device.name) {
            device.name = device.hostname + ":" + device.port;
        }

        this.socketService.subscribe('hostcheck').subscribe((message: any) => {
            switch(message['state']) {
            case ssh_hostcheck_status.SSH_SERVER_KNOWN_CHANGED:
                message['msg'] = "Server has changed.";
                break;
            case ssh_hostcheck_status.SSH_SERVER_NOT_KNOWN:
                message['msg'] = "Server not known.";
                break;
            }
            let modalRef = this.modalService.open(DialogueHostcheck, {centered: true, backdrop: 'static', keyboard: false});
            modalRef.componentInstance.hostcheck = message;
            modalRef.result.then((result) => {
                this.socketAnswer('hostcheck_result', message['id'], 'result', result);
            }, (reason) => {
                this.socketAnswer('hostcheck_result', message['id'], 'result', false);
            });
        });

        this.socketService.subscribe('device_auth').subscribe((message: any) => {
            let modalRef = this.modalService.open(DialoguePassword, {centered: true, backdrop: 'static', keyboard: false});
            modalRef.componentInstance.info = message;
            modalRef.result.then((result) => {
                this.socketAnswer('device_auth_password', message['id'], 'password', result);
            }, (reason) => {
                this.socketAnswer('device_auth_password', message['id'], 'password', '');
            });
        });

        this.socketService.subscribe('getschema').subscribe((message: any) => {
            let modalRef = this.modalService.open(DialogueSchema, {centered: true, backdrop: 'static', keyboard: false});
            modalRef.componentInstance.info = message;
            modalRef.result.then((result) => {
                this.socketAnswer('getschema_result', message['id'], 'filename', result['filename'], 'data', result['data']);
            }, (reason) => {
                this.socketAnswer('getschema_result', message['id'], 'filename', '', 'data', '');
            });
        });

        this.sessionsService.connect(device).subscribe(result => {
            if (result['success']) {
                this.router.navigateByUrl('/netopeer/config');
            } else {
                this.err_msg = result['error-msg']
            }
            this.socketService.unsubscribe('hostcheck');
            this.socketService.unsubscribe('device_auth');
        });
    }

    ngOnInit(): void {
        this.getDevices();
    }
}

@Component({
    selector: 'ngbd-modal-content',
    styleUrls: ['../netopeer.scss'],
    template: `<div class="modal-header">
        <h4 *ngIf="hostcheck.msg" class="modal-title">{{hostcheck.msg}}</h4>
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
export class DialogueHostcheck {
    @Input() hostcheck;
    constructor(public activeModal: NgbActiveModal) { }
}

@Component({
    selector: 'ngbd-modal-content',
    styleUrls: ['../netopeer.scss'],
    template: `<div class="modal-header">
        <h4 class="modal-title">{{info.type}}</h4>
    </div>
    <div class="modal-body">
        <label for="device_password">{{info.msg}}</label><br/>
        <input id="device_password" type="password" [(ngModel)]="password"  (keyup.enter)="activeModal.close(password)"/>
    </div>
    <div class="modal-footer">
        <button class="btn btn-light" [disabled]="!password" (click)="activeModal.close(password)">ok</button> /
        <button class="btn btn-light" (click)="activeModal.close('')">cancel</button>
    </div>`
})
export class DialoguePassword implements OnInit {
    @Input() info;
    password = '';

    constructor(public activeModal: NgbActiveModal) { }

    ngOnInit(): void {
        document.getElementById('device_password').focus();
    }
}

@Component({
    selector: 'ngbd-modal-content',
    styleUrls: ['../netopeer.scss'],
    template: `<div class="modal-header">
        <h4 class="modal-title">Missing YANG Schema</h4>
    </div>
    <div class="modal-body">
        <label>The device utilize YANG schema <b>{{info.name}}</b> <ng-container *ngIf="info.revision">in revision <b>{{info.revision}}</b></ng-container>.<br/>
        <span *ngIf="!info['submod_name']">Please provide this schema.</span>
        <span *ngIf="info['submod_name']">Please provide submodule <b>{{info['submod_name']}}</b> <ng-container *ngIf="info['submod_revision']">in revision <b>{{info['submod_revision']}}</b></ng-container> for this schema.</span>
        </label><br/>
        <input id="uploadSchema" #uploadSchema type="file" (change)="upload(uploadSchema.files[0])" name="schema" placeholder="Upload schema"/>
    </div>
    <div class="modal-footer">
        <button class="btn btn-light" (click)="activeModal.dismiss(null)">cancel</button>
    </div>`
})
export class DialogueSchema implements OnInit {
    @Input() info;
    password = '';

    constructor(public activeModal: NgbActiveModal) { }

    upload(schema: File) {
        let reader = new FileReader();

        console.log(schema);
        reader.onloadend = () => {
            //console.log(reader.result);
            this.activeModal.close({'filename': schema.name, 'data': reader.result});
        };
        reader.readAsText(schema);
    }

    ngOnInit(): void {
        document.getElementById('uploadSchema').focus();
    }
}
