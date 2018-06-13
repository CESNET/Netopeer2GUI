import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';

import { Device } from './device';

@Injectable()
export class DevicesService {
    constructor(private http: HttpClient) {}

  getDevices(): Observable<Device[]> {
      return this.http.get<Device[]>('/netopeer/inventory/devices/list')
          .pipe(
              catchError(err => Observable.throw(err))
          );
  }

  addDevice(device: Device) {
      // let options = new HttpOptions({ body: JSON.stringify(device) });
      return this.http.post<object>('/netopeer/inventory/devices', device)
          .pipe(
              catchError(err => Observable.throw(err))
          );
  }

  rmDevice(device_id: number) {
      // We need to use generic HTTP request, because HttpClient does not support body in DELETE requests.
      return this.http.request('DELETE', '/netopeer/inventory/devices', { body: JSON.stringify({'id':device_id}) })
          .pipe(
              catchError(err => Observable.throw(err))
          );
  }
}
