/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Base component for the YANG Configure tool
 * Loads configuration and switches between devices
 */
import {Component, OnInit} from '@angular/core';
// @ts-ignore
import {ConfigurationService, DeviceService, SessionService} from 'netconf-lib';
import {Session} from 'netconf-lib/lib/classes/session';
import {NodeControlService} from '../services/node-control.service';
import {Device} from 'netconf-lib/lib/classes/device';

@Component({
  selector: 'nct-yang-configure',
  templateUrl: './yang-configure.component.html',
  styleUrls: ['./yang-configure.component.scss']
})
export class YangConfigureComponent implements OnInit {
  constructor(
    public sessionService: SessionService,
    public nodeControlService: NodeControlService,
    private deviceService: DeviceService
  ) {
  }

  sessions: Session[] = [];
  error = '';
  helpShown = false;

  selected_data = [];
  loading = false;
  selectedSession: Session;

  commitChangesShown = false;

  ngOnInit(): void {
    this.sessionService.loadOpenSessions().subscribe(
      sessions => {
        console.log(sessions);
        this.sessionService.sessions = sessions;
      }
    );
    this.sessionService.modificationAdded.subscribe(
      session => {
        if (session.key === this.selectedSession.key) {
          console.log('Got modification event');
          console.log(session.modifications);
          this.selectedSession.modifications = session.modifications; // Update selected session value
          this.commitChangesShown = true;
        }
      }
    );
  }

  changeSelectedSession(session: Session) {
    this.selectedSession = session;
    this.loadSessionRpc(session, false);
  }

  onDevicesSelected(sessions: Session[]) {
    this.sessions = sessions;
    this.selectedSession = sessions[0];
    /* for (const session of this.sessions) {
    } */
  }

  loadSessionRpc(session: Session, forceReload: boolean = false) {
    const idx = this.sessions.indexOf(session);
    if (forceReload || !this.sessions[idx].data) {
      this.loading = true;
      this.sessionService.rpcGet(session.key, true).subscribe(
        response => {
          switch (response['code']) {
            case 200:
              console.log(response['data']);
              this.error = '';
              this.selected_data = response['data'];
              this.sessions[idx].data = response['data'];
              this.loading = false;
              break;
            case 410:
              this.error = 'Connection failed: ' + response['message'];
              this.loading = false;
              break;
            case 418:
              this.error = 'NETCONF error: ' + response['message'];
              this.loading = false;
              break;
            default:
              console.error('Invalid response code!');
              this.loading = false;
              break;
          }
          // this.loading = false;
        },
        err => {
          this.error = 'HTTP error: ' + err.message;
          this.loading = false;
        }
      );
    } else {
      this.selected_data = this.sessions[idx].data;
    }
  }

  toggleHelp() {
    if (this.helpShown) {
      this.nodeControlService.hideHelpOnAll();
    } else {
      this.nodeControlService.showHelpOnAll();
    }
    this.helpShown = !this.helpShown;
  }

  reconnectDevice(device: Device) {
    this.deviceService.connectToDevice(device).subscribe();
  }

}
