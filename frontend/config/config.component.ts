import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

import {SessionsService} from './sessions.service';
import {Session} from './session';

@Component({
    selector: 'netopeer-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss']
})

export class ConfigComponent implements OnInit {
    title = 'Configuration';
    activeSession: Session;
    err_msg = "";
    loading = false;

    constructor(private sessionsService: SessionsService, private router: Router) {}

    addSession() {
        this.router.navigateByUrl('/netopeer/inventory/devices');
    }

    reloadData() {
        this.activeSession.data = null;
        if (this.activeSession.dataVisibility == 'all') {
            this.rpcGet(true);
        } else if(this.activeSession.dataVisibility == 'root') {
            this.rpcGet(false);
        }
    }

    disconnect(key: string) {
        this.sessionsService.close(key).subscribe(result => {
            if (result['success']) {
                if (!this.sessionsService.activeSession) {
                    this.router.navigateByUrl('/netopeer/inventory/devices');
                }
                this.activeSession = this.sessionsService.getActiveSession();
            } else {
                this.err_msg = result['error-msg'];
            }
        });
    }

    setCpbltsVisibility(value: boolean) {
        this.activeSession.cpbltsVisibility = value;
        this.sessionsService.storeData();
    }

    setDataVisibility(value: string) {
        this.activeSession.dataVisibility = value;
        this.sessionsService.storeData();
    }

    invertStatus() {
        this.activeSession.statusVisibility = !this.activeSession.statusVisibility;
        this.sessionsService.storeData();
    }

    getCapabilities(key: string) {
        if (this.activeSession.cpblts) {
            this.activeSession.cpbltsVisibility = true;
            this.sessionsService.storeData();
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
            this.sessionsService.storeData();
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

    rpcGet(all: boolean) {
        if (this.activeSession.data) {
            if ((all && this.activeSession.dataVisibility == 'all') ||
                (!all && this.activeSession.dataVisibility == 'root')) {
                return;
            }
        }
        this.loading = true;
        this.sessionsService.rpcGetSubtree(this.activeSession.key, all).subscribe(result => {
            if (result['success']) {
                this.activeSession.data = result['data'];
                if (all) {
                    this.activeSession.dataVisibility = 'all';
                } else {
                    this.activeSession.dataVisibility = 'root';
                }
            } else {
                this.activeSession.dataVisibility = 'none';
                if ('error-msg' in result) {
                    this.err_msg = result['error-msg'];
                } else {
                    this.err_msg = result['error'][0]['message'];
                }
            }
            this.sessionsService.storeData();
            this.loading = false;
        });
    }

    cancelChangesNode(node, recursion = true) {
        if ('creatingChild' in node) {
            delete node['creatingChild'];
        }
        if ('deleted' in node) {
            node['dirty'] = false;
            node['deleted'] = false;
        }

        if (this.activeSession.modifications) {
            let record = this.sessionsService.getModificationsRecord(node['path']);
            if (record) {
                node['dirty'] = false;
                if (record['type'] == 'change') {
                    node['value'] = record['original'];
                }
                this.sessionsService.removeModificationsRecord(node['path']);
                if (!this.activeSession.modifications) {
                    return;
                }
            }
        }

        /* recursion */
        if (recursion && 'children' in node) {
            for (let child of node['children']) {
                this.cancelChangesNode(child);
            }
            if ('newChildren' in node) {
                for (let child of node['newChildren']) {
                    this.sessionsService.removeModificationsRecord(child['path']);
                }
                delete node['newChildren'];
                if (('children' in node) && node['children'].length) {
                    node['children'][node['children'].length - 1]['last'] = true;
                }
            }
        }
    }

    cancelChanges() {
        //console.log(JSON.stringify(this.activeSession.modifications))
        for (let iter of this.activeSession.data) {
            this.cancelChangesNode(iter);
        }
        this.sessionsService.storeData();
        //console.log(JSON.stringify(this.activeSession.modifications))
    }

    applyChanges() {
        /* TODO */
        this.cancelChanges();
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
        this.activeSession = this.sessionsService.getActiveSession();
    }

    changeActiveSession(key: string) {
        this.activeSession = this.sessionsService.changeActiveSession(key);
    }
}
