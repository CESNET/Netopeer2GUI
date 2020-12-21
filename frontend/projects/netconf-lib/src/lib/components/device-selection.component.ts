/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A list of connected devices with checkboxes next to each device
 * Outputs a list of selected devices when user clicks the submit button
 */

import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {SessionService} from '../services/session.service';
import {Session} from '../classes/session';

@Component({
  selector: 'lib-device-selection',
  templateUrl: './device-selection.component.html',
  styleUrls: ['./device-selection.component.scss'],
})
export class DeviceSelectionComponent implements OnInit {

  @Input() schemaFilter = '';
  @Output() devicesSelected: EventEmitter<Session[]> = new EventEmitter<Session[]>();
  compatibleDevices: {session: Session, selected: boolean}[] = [];

  errorMessage = '';

  constructor(public sessionService: SessionService) {
  }

  ngOnInit() {
    this.reload();
  }

  /**
   * Returns true, if there is at least one device selected. Returns false otherwise.
   */
  areDevicesSelected(): boolean {
    for (const d of this.compatibleDevices) {
      if (d.selected) {
        return true;
      }
    }
    return false;
  }

  setAllSelectionsTo(val: boolean) {
    for (const d of this.compatibleDevices) {
      d.selected = val;
    }
  }

  submit() {
    if (this.areDevicesSelected()) {
      const selectedDevices: Session[] = [];
      for (const d of this.compatibleDevices) {
        if (d.selected) {
          selectedDevices.push(d.session);
        }
      }
      this.devicesSelected.emit(selectedDevices);
      this.errorMessage = '';
    } else {
      this.errorMessage = 'No devices selected';
    }
  }

  reload() {
    this.sessionService.getCompatibleDeviceSessions('').subscribe(
      ses => {
        this.compatibleDevices = [];
        for (const s of ses) {
          this.compatibleDevices.push({session: s, selected: true});
        }
      }
    );
    this.sessionService.sessionsChanged.subscribe(
      ses => {
        this.compatibleDevices = [];
        for (const s of ses) {
          this.compatibleDevices.push({session: s, selected: true});
        }
      }
    );
  }

}
