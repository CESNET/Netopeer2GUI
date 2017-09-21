import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

import {SessionsService} from './sessions.service';
import {Device} from '../inventory/device';

@Component({
    selector: 'netopeer-config',
    templateUrl: './config.component.html',
    styleUrls: ['../netopeer.css', './config.component.css']
})

export class ConfigComponent implements OnInit {
    title = 'Configuration';
    data;
    err_msg = "";

    constructor(private sessionsService: SessionsService, private router: Router) {}

    addSession() {
        this.router.navigateByUrl('/netopeer/inventory/devices');
    }

    disconnect(key: string) {
        this.sessionsService.close(key).subscribe(result => {
            if (result['success']) {
                if (!this.sessionsService.activeSession) {
                    this.router.navigateByUrl('/netopeer/inventory/devices');
                }
            } else {
                this.err_msg = result['error-msg'];
            }
        });
    }

    getCapabilities(key: string) {
        this.sessionsService.getCpblts(key).subscribe(result => {
            if (result['success']) {
                this.data = result['capabilities']
            } else {
                this.err_msg = result['error-msg']
            }
        });
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
        if (this.sessionsService.activeSession) {
            this.getCapabilities(this.sessionsService.activeSession);
        }
    }
}
