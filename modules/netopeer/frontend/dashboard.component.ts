import { Component } from '@angular/core';
import {Router} from '@angular/router';

import {SessionsService} from './config/sessions.service';

@Component({
  selector : 'netopeer-dashboard',
  templateUrl : './dashboard.component.html',
  styleUrls : ['./netopeer.scss', 'inventory/inventory.component.scss']
})

export class DashboardComponent {

    constructor(public sessionsService: SessionsService,
                private router: Router) {}

    gotoConfig(session) {
        this.sessionsService.changeActiveSession(session.key);
        this.router.navigateByUrl('/netopeer/config');
    }
}
