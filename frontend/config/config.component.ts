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
    cpblts;
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
                this.cpblts = result['capabilities']
            } else {
                this.err_msg = result['error-msg']
            }
        });
    }

    rpcGet(key: string) {
        this.sessionsService.rpcGet(key).subscribe(result => {
            if (result['success']) {
                this.data = result['data']
            } else if ('error-msg' in result) {
                this.err_msg = result['error-msg']
            } else {
                this.err_msg = result['error'][0]['message']
            }
        });
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
    }
}
