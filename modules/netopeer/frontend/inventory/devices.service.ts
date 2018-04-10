import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';

import { Device } from './device';

@Injectable()
export class DevicesService {
    constructor(private http: Http) {}

  getDevices(): Observable<Device[]> {
      return this.http.get('/netopeer/inventory/devices/list')
          .map((resp: Response) => resp.json())
          .catch((err: Response | any) => Observable.throw(err));
  }

  addDevice(device: Device) {
      let options = new RequestOptions({ body: JSON.stringify(device) });
      return this.http.post('/netopeer/inventory/devices', null, options)
          .map((resp: Response) => resp.json())
          .catch((err: Response | any) => Observable.throw(err));
  }

  rmDevice(device_id: number) {
      let options = new RequestOptions({ body: JSON.stringify({'id':device_id}) });
      return this.http.delete('/netopeer/inventory/devices', options)
          .map((resp: Response) => resp.json())
          .catch((err: Response | any) => Observable.throw(err));
  }
}
