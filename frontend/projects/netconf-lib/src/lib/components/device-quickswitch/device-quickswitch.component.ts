/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Quickly switch between selected devices
 */
import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {DeviceService} from '../../services/device.service';
import {Device} from '../../classes/device';
import {Session} from '../../classes/session';

@Component({
  selector: 'lib-device-quickswitch',
  templateUrl: './device-quickswitch.component.html',
  styleUrls: ['./device-quickswitch.component.scss']
})
export class DeviceQuickswitchComponent implements OnInit {

  @Input() sessions: Session[];
  @Input() vertical = false;
  @Input() multiSelect = true;

  @Output() selectionChanged: EventEmitter<Session[]> = new EventEmitter<Session[]>();
  compatibleDevices: Device[] = [];
  selected: Session[];

  constructor(private deviceService: DeviceService) { }

  ngOnInit() {
    if (this.sessions) {
      if (this.multiSelect) {
        this.selected = this.sessions;
      } else {
        this.selected = [this.sessions[0]];
      }
      this.selectionChanged.emit(this.selected);
    }
  }

  sessionSelected(session: Session) {
    if (this.multiSelect) {
      if (this.selected.indexOf(session) === -1) {
        this.selected.push(session);
        this.selectionChanged.emit(this.selected);
      }
    } else {
      if (this.selected[0] !== session) {
        this.selected[0] = session;
        this.selectionChanged.emit(this.selected);
      }
    }
  }

}
