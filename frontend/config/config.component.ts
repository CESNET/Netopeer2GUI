import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

import {TreeService} from './tree.service';
import {ModificationsService} from './modifications.service';
import {SessionsService} from './sessions.service';
import {Session} from './session';

@Component({
    selector: 'netopeer-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss'],
    providers: [ModificationsService]
})

export class ConfigComponent implements OnInit {
    title = 'Configuration';
    activeSession: Session;
    err_msg = "";
    commit_error = [];

    constructor(private sessionsService: SessionsService,
                private modsService: ModificationsService,
                private router: Router) {}

    addSession() {
        this.router.navigateByUrl('/netopeer/inventory/devices');
    }

    reloadData() {
        this.activeSession.data = null;
        if (this.activeSession.dataVisibility == 'root') {
            this.sessionsService.rpcGet(this.activeSession, false);
        } else {
            this.sessionsService.rpcGet(this.activeSession, true);
        }
    }

    disconnect(key: string) {
        this.sessionsService.close(key).subscribe(result => {
            if (result['success']) {
                if (!this.sessionsService.activeSession) {
                    this.router.navigateByUrl('/netopeer/inventory/devices');
                }
                this.activeSession = this.sessionsService.getSession();
            } else {
                this.err_msg = result['error-msg'];
            }
        });
    }

    setCpbltsVisibility(value: boolean) {
        this.activeSession.cpbltsVisibility = value;
        this.sessionsService.storeSessions();
    }

    invertStatus() {
        this.activeSession.statusVisibility = !this.activeSession.statusVisibility;
        this.sessionsService.storeSessions();
    }

    getCapabilities(key: string) {
        if (this.activeSession.cpblts) {
            this.activeSession.cpbltsVisibility = true;
            this.sessionsService.storeSessions();
            return;
        }
        this.sessionsService.getCpblts(key).subscribe(result => {
            if (result['success']) {
                this.activeSession.cpblts = result['capabilities'];
                this.activeSession.cpbltsVisibility = true;
            } else {
                this.activeSession.cpbltsVisibility = false;
                this.err_msg = result['error-msg'];
            }
            this.sessionsService.storeSessions();
        });
    }

    parseCapabilityName(cpblt: string): string {
        let name = cpblt;
        let pos = cpblt.search('module=');
        if (pos != -1) {
            /* schema */
            pos += 7;
            name = cpblt.slice(pos);
            let end = name.search('&');
            if (end != -1) {
                name = name.slice(0, end);
            }
        } else {
            /* capability */
            pos = 0;
            if (cpblt.match('urn:ietf:params:netconf:capability:*')) {
                pos = 34;
            } else if (cpblt.match('urn:ietf:params:netconf:*')) {
                pos = 23;
            }
            name = cpblt.slice(pos);

            let end = name.search('\\?');
            if (end != -1) {
                name = name.slice(0, end);
            }
            pos = name.lastIndexOf(':')
            name = name.slice(0, pos);
        }
        return name;
    }

    parseCapabilityRevision(cpblt: string): string {
        let version = "";
        let pos = cpblt.search('revision=');
        if (pos != -1) {
            pos += 9;
            version = cpblt.slice(pos);
            let end = version.search('&');
            if (end != -1) {
                version = version.slice(0, end);
            }
            return version;
        } else if (cpblt.match('urn:ietf:params:netconf:*')) {
            let end = cpblt.search('\\?');
            if (end != -1) {
                cpblt = cpblt.slice(0, end);
            }
            pos = cpblt.lastIndexOf(':')
            version = cpblt.slice(pos + 1);
        }
        return version;
    }

    cancelChanges() {
        //console.log(JSON.stringify(this.activeSession.modifications))
        this.modsService.cancelModification(this.activeSession);
        this.commit_error = [];
        this.sessionsService.storeSessions();
        //console.log(JSON.stringify(this.activeSession.modifications))
    }

    applyChanges() {
        //console.log(JSON.stringify(this.activeSession.modifications))
        this.modsService.applyModification(this.activeSession).then(result => {
            if (result['success']) {
                this.reloadData();
                this.commit_error = [];
            } else {
                this.commit_error = result['error'];
            }
        })
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
        this.activeSession = this.sessionsService.getSession();
        if (this.activeSession && !this.activeSession.data) {
            this.sessionsService.rpcGet(this.activeSession, false);
        }
    }
}
