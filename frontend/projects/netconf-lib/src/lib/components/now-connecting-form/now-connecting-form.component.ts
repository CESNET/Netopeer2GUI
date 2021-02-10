/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A dialog shown when connecting to devices
 */
import {Component, OnInit} from '@angular/core';
import {DeviceService} from '../../services/device.service';
import {SessionService} from '../../services/session.service';
import {SocketService} from '../../services/socket.service';
import {ConnectionStatus} from '../../classes/ConnectionStatus';
import {DeviceWithStatus} from '../../classes/DeviceWithStatus';
import {NotificationService} from '../../services/notification.service';


enum ssh_hostcheck_status {
  SSH_SERVER_NOT_KNOWN = 0,
  SSH_SERVER_KNOWN_CHANGED = 2,
  SSH_SERVER_FOUND_OTHER = 3,
  SSH_SERVER_FILE_NOT_FOUND = 4
}


@Component({
  selector: 'lib-now-connecting',
  templateUrl: './now-connecting-form.component.html',
  styleUrls: ['./now-connecting-form.component.scss']
})
export class NowConnectingFormComponent implements OnInit {


  show = false;
  connecting = false;

  error = '';

  schemasRequired = [];

  constructor(public deviceService: DeviceService,
              public socketService: SocketService,
              public sessionService: SessionService,
              public notificationService: NotificationService) {
  }

  ngOnInit() {

    this.deviceService.newDevicesShouldBeConnected.subscribe(
      newRequest => {
        if (!this.shouldCloseSelf()) {
          this.show = true;
          this.connectToAllWaiting();
          this.connecting = true;
        } else {
          this.show = false;
        }
      }
    );


    this.socketService.subscribe('device_auth').subscribe((message: any) => {
      this.handleAuthRequest(message);
    });
    this.socketService.subscribe('getschema').subscribe((message: any) => {
      this.schemasRequired.push(message);
    });
    this.socketService.subscribe('hostcheck').subscribe((message: any) => {
      this.handleHostkeyCheck(message);
    });
  }

  connectToAllWaiting() {
    for (const dev of this.deviceService.nowConnectingDevices) {
      if (dev.status === ConnectionStatus.WAITING_FOR_CONNECTION) {
        this.connectToDevice(dev);
      }
    }
  }

  connectToDevice(device: DeviceWithStatus) {
    this.updateDeviceStatus(device, ConnectionStatus.CONNECTING);
    this.deviceService.connectToDevice(device.device).subscribe(
      request => {
        if (request['success']) {
          this.sessionService.addSession(request['session-key'], device.device);
          this.updateDeviceStatus(device, ConnectionStatus.WAITING_FOR_DEVICE);
          this.checkSession(request['session-key'], device);
        } else {
          if (request['message']) {
            this.updateDeviceStatus(device, request['message']);
          } else {
            this.updateDeviceStatus(device, ConnectionStatus.ERR_SERVER);
          }

        }
        this.connecting = false;
      },
      err => {
        this.updateDeviceStatus(device, ConnectionStatus.ERR_HTTP);
        this.connecting = false;
      }
    );
  }

  checkSession(key, device: DeviceWithStatus) {
    this.sessionService.sessionAlive(key).subscribe(
      alive => {
        if (alive['success']) {
          this.updateDeviceStatus(device, ConnectionStatus.CONNECTED);
          if (this.shouldCloseSelf()) {
            this.deviceService.clearWaitList();
            this.close();
          }
        } else {
          this.updateDeviceStatus(device, ConnectionStatus.ERR_SERVER);
        }
      },
      err => {
        this.updateDeviceStatus(device, ConnectionStatus.ERR_HTTP);
      }
    );
  }

  updateDeviceStatus(device: DeviceWithStatus, newStatus: ConnectionStatus | string) {
    const idx = this.deviceService.nowConnectingDevices.indexOf(device);
    if (idx >= 0) {
      this.deviceService.nowConnectingDevices[idx].status = newStatus;
    }
  }


  shouldCloseSelf() {
    for (const device of this.deviceService.nowConnectingDevices) {
      if (device.status !== ConnectionStatus.CONNECTED) {
        return false;
      }
    }
    return true;
  }

  close() {
    this.show = false;
  }

  cancel() {
    this.sessionService.destroyAllSessions().subscribe(
      _ => {
        this.sessionService.sessions = [];
        this.deviceService.clearWaitList();
        this.notificationService.sendNotification(
          this.notificationService.createNotification('Connecting canceled!', '', 'internal'));
        this.close();
      },
      err => {
        this.error = err.message;
      }
    );
  }

  handleAuthRequest(message) {
    this.socketService.send('device_auth_password', {'id': message['id'], 'password': prompt('Enter password')});
  }

  handleHostkeyCheck(message) {
    switch (message['state']) {
      case ssh_hostcheck_status.SSH_SERVER_KNOWN_CHANGED:
        message['msg'] = 'Server has changed.';
        break;
      case ssh_hostcheck_status.SSH_SERVER_NOT_KNOWN:
        message['msg'] = 'Server not known.';
        break;
    }
    const device = this.findDeviceByData(
      message['device']['hostname'],
      message['device']['port'],
      message['device']['username'],
      message['device']['name']
    );
    if (device) {
      const idx = this.deviceService.nowConnectingDevices.indexOf(device);
      this.deviceService.nowConnectingDevices[idx].status = ConnectionStatus.ERR_HOSTCHECK_CONFIRMATION;
      this.deviceService.nowConnectingDevices[idx].hostcheckMessageId = message['id'];
      this.deviceService.nowConnectingDevices[idx].hostcheckMessage = message['msg'];
      this.deviceService.nowConnectingDevices[idx].device.fingerprint = message['hexa'];
    }

  }

  confirmHostkeyCheck(messageId, value: boolean, deviceIdx: number) {
    this.deviceService.nowConnectingDevices[deviceIdx].status = ConnectionStatus.WAITING_FOR_DEVICE;
    this.socketService.send('hostcheck_result', {'id': messageId, 'result': value});
  }

  uploadSchema(fileInput: FileList, schema: any) {
    if (fileInput && fileInput.item(0)) {
      const idx = this.schemasRequired.indexOf(schema);
      this.schemasRequired[idx]['status'] = 1;
      const reader = new FileReader();
      const file: File = fileInput[0];
      reader.onloadend = (e) => {
        this.socketService.send('getschema_result', {
          'id': schema['id'],
          'filename': fileInput[0]['name'],
          'data': reader.result
        });
        this.schemasRequired[idx]['status'] = 2;
      };
      reader.readAsText(file);

    }
  }

  skipSchemaUpload() {
    for (const schema of this.schemasRequired) {
      this.socketService.send('getschema_result', {'id': schema['id'], 'filename': '', 'data': ''});
    }
    this.schemasRequired = [];
  }

  isString(val: any) {
    return typeof val === 'string';
  }

  findDeviceByData(hostname, port, username, name): DeviceWithStatus {
    return this.deviceService.nowConnectingDevices.find(
      e => e.device.hostname === hostname &&
        e.device.port === port &&
        e.device.username === username &&
        e.device.name === name
    );
  }


}
