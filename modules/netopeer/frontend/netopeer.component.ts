import { Component, OnInit } from '@angular/core';

import { SessionsService } from './config/sessions.service';
import { DevicesService } from './inventory/devices.service';
import { Device } from './inventory/device';

class NComponent {
  route: string;
  name: string;
}

const NCOMPONENTS: NComponent[] = [
  { route : 'inventory', name: 'Inventory' },
  { route : 'config', name: 'Configuration' },
  { route : 'yang', name: 'YANG Explorer' },
  { route : 'monitoring', name: 'Monitoring' },
  { route : 'plugins', name: 'Plugins' }
];

@Component({
  selector : 'netopeer',
  templateUrl : './netopeer.component.html',
  styleUrls : ['./netopeer.scss'],
})

export class NetopeerComponent implements OnInit {
  componentTitle = '';
  netopeerComponents = NCOMPONENTS;

  constructor(private sessionsService: SessionsService,
              private devicesService: DevicesService) { }

  ngOnInit() {
      /* autoconnect selected devices if needed */
      if (localStorage.getItem('netopeer-autoconnect') == 'enabled') {
          let ac_sessions: number[] = []; /* currently connected autoconnect devices' ids */
          for (let session of this.sessionsService.sessions) {
              if (session.device.autoconnect) {
                  ac_sessions.push(session.device.id);
              }
          }
          let ac_devices: Device[] = []; /* devices with enabled autoconnect */
          this.devicesService.getDevices().subscribe(devices => {
              for (let device of devices) {
                  if (!device['autoconnect']) {
                      continue;
                  }
                  let i = ac_sessions.indexOf(device.id);
                  if (i != -1) {
                      ac_sessions.splice(i, 1);
                      continue;
                  }
                  /* we have not connected autoconnect device */
                  ac_devices.push(device);
              }
              for (let device of ac_devices) {
                  this.sessionsService.connect(device).subscribe();
              }
              localStorage.setItem('netopeer-autoconnect', 'done');
          });
      }
  }

  onActivate(componentRef) {
    this.componentTitle = componentRef.title;
  }
  onDeactivate(componentRef) {
    this.componentTitle = '';
  }
}
