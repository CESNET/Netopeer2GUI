/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Popup shown to the user before connecting to all devices from the profiles tab
 */

import {Component, OnInit, Output, EventEmitter, Input} from '@angular/core';
import {DeviceService, SessionService} from "../../netconf-lib";
import {ProfileDevice} from "../../classes/ProfileDevice";


@Component({
  selector: 'nc-connect-profile',
  templateUrl: './popup-connect-profile.component.html',
  styleUrls: ['./profiles.component.scss']
})
export class PopupConnectProfileComponent implements OnInit {

  @Input() profileName: string;
  @Input() devices: ProfileDevice[];
  @Output() shouldClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  error = '';

  constructor(private deviceService: DeviceService, private sessionService: SessionService) {
  }

  ngOnInit() {
    if(this.sessionService.sessions == []) {
      this.connect();
    }
  }

  public connectProfile(purge: boolean) {
    if(purge) {
      this.sessionService.destroyAllSessions().subscribe(
        _ => {
          this.sessionService.sessions = [];
          this.deviceService.nowConnectingDevices = [];
          this.connect();
        }
      )
    }
    else {
      this.connect();
    }
  }

  connect() {
    this.deviceService.createConnectionRequest(this.devices);
    this.shouldClose.emit(true);
  }

}
