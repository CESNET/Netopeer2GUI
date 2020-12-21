/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 */

import {Component, OnInit} from '@angular/core';
import {NetconfLibService, SessionService} from 'netconf-lib';
import {Session} from 'netconf-lib/lib/classes/session';

@Component({
  selector: 'nct-example-tool',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent implements OnInit {
  constructor(private libService: NetconfLibService, private sessionService: SessionService
  ) {
  }

  x = false;
  serviceText = 'Loading service...';
  sessions: Session[] = [];
  selectedSessions = [];

  ngOnInit(): void {
    this.serviceText = this.libService.provideExample();
  }

  onDevicesSelected(sessions: Session[]) {
    this.sessions = sessions;
    this.selectedSessions = sessions;
  }

  onDeviceSelectionChanged(sessions: Session[]) {
    this.selectedSessions = sessions;
  }
}
