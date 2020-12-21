/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Handling device connecting, saving and loading
 */

import {EventEmitter, Injectable} from '@angular/core';
import {Device} from '../classes/device';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ConnectionStatus} from '../classes/ConnectionStatus';
import {DeviceWithStatus} from '../classes/DeviceWithStatus';


@Injectable()
export class DeviceService {
  constructor(public http: HttpClient) {
  }


  public nowConnectingDevices: DeviceWithStatus[] = [];
  public newDevicesShouldBeConnected: EventEmitter<boolean> = new EventEmitter<boolean>();

  public getSavedDevices(): Observable<Device[]> {
    return this.http.get<Device[]>('/netconf/devices');
  }

  public saveDevice(hostname: string,
                    port: number,
                    username: string,
                    deviceName = '',
                    password = '',
                    connect = false): Observable<object> {
    const dev: Device = {
      fingerprint: '',
      id: '',
      name: deviceName,
      hostname,
      port,
      username,
      password
    };

    if (connect) {
      this.createConnectionRequest([dev]);
    }
    return this.http.post<object>('/netconf/device', {device: dev});
  }

  public createConnectionRequest(devices: Device[]) {
    for (const device of devices) {
      this.nowConnectingDevices.push({device: device, status: ConnectionStatus.WAITING_FOR_CONNECTION});
    }
    this.newDevicesShouldBeConnected.emit(true);
  }


  public connectToDevice(device: Device) {
    const body = {
      'name': device.name,
      'hostname': device.hostname,
      'port': device.port,
      'username': device.username,
      'password': device.password
    };
    return this.http.post('/netconf/connect', body);
  }

  public clearWaitList() {
    this.nowConnectingDevices = [];
  }

}
