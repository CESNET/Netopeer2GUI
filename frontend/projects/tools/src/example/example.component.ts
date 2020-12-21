/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Example tool component
 * Edit this component to start developing a your tool
 * After the onDevicesSelected function is called, you can call rpc_get on the sessions
 */

import {Component, OnInit} from '@angular/core';
import {NetconfLibService, SessionService} from 'netconf-lib';
import {Session} from 'netconf-lib/lib/classes/session';

@Component({
  selector: 'nct-example-tool',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements OnInit {
  constructor(private libService: NetconfLibService, private sessionService: SessionService
  ) {
  }

  x = false;
  serviceText = 'Loading service...';
  sessions: Session[] = [];

  ngOnInit(): void {
    this.serviceText = this.libService.provideExample();
  }

  onDevicesSelected(sessions: Session[]) {
    this.sessions = sessions;
  }
}
