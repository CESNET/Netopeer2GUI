import {Component, Injectable, OnInit} from '@angular/core';
import {Router} from '@angular/router';

import {ModificationsService} from './modifications.service';
import {SessionsService} from './sessions.service';
import {Session} from './session';

@Injectable()
export class TreeService {
    loading = false;

    constructor(private sessionsService: SessionsService, private modsService: ModificationsService) {}

    rpcGet(activeSession, all: boolean) {
        if (activeSession.data) {
            if ((all && activeSession.dataVisibility == 'all') ||
                (!all && activeSession.dataVisibility == 'root')) {
                return;
            }
        }
        this.loading = true;
        delete activeSession.data;
        this.sessionsService.rpcGetSubtree(activeSession.key, all).subscribe(result => {
            if (result['success']) {
                for (let iter of result['data']) {
                    this.modsService.setDirty(activeSession, iter);
                }
                activeSession.data = {};
                activeSession.data['path'] = '/';
                activeSession.data['info'] = {};
                activeSession.data['info']['path'] = '/';
                activeSession.data['children'] = result['data'];
                if (all) {
                    activeSession.dataVisibility = 'all';
                } else {
                    activeSession.dataVisibility = 'root';
                }
                console.log(activeSession.data);
            }
            this.sessionsService.storeData();
            this.loading = false;
        });
    }

    expandable(node): boolean {
        if (node['info']['type'] == 1 || /* container */
            node['info']['type'] == 16) { /* list */
                return true;
        }
        return false;
    }

    hasHiddenChild(node, clean=false): boolean {
        if (!clean && 'hasHiddenChild' in node) {
            return node['hasHiddenChild'];
        }
        node['hasHiddenChild'] = false;
        if (!this.expandable(node)) {
            /* terminal node (leaf or leaf-list) */
            return node['hasHiddenChild'];
        } else if (!('children' in node)) {
            /* internal node without children */
            node['hasHiddenChild'] = true;
        } else {
            /* go recursively */
            for (let child of node['children']) {
                if (this.hasHiddenChild(child, clean)) {
                    node['hasHiddenChild'] = true;
                    break;
                }
            }
        }
        return node['hasHiddenChild'];
    }

    updateHiddenFlags(activeSession) {
        let mixed = false;
        let rootsonly = true;
        for (let root of activeSession.data['children']) {
            if (this.hasHiddenChild(root, true)) {
                mixed = true;
            } else {
                rootsonly = false;
            }
        }
        if (mixed) {
            if (rootsonly) {
                activeSession.dataVisibility = 'root';
            } else {
                activeSession.dataVisibility = 'mixed';
            }
        }
    }

    collapse(activeSession, node = null) {
        if (node) {
            delete node['children'];
            activeSession.dataVisibility = 'mixed';
        } else {
            for (let root of activeSession.data['children']) {
                delete root['children'];
            }
            activeSession.dataVisibility = 'root';
        }
        this.updateHiddenFlags(activeSession);
        this.sessionsService.storeData();
    }

    expand(activeSession, node, all: boolean) {
        node['loading'] = true;
        this.sessionsService.rpcGetSubtree(activeSession.key, all, node['path']).subscribe(result => {
            if (result['success']) {
                for (let iter of result['data']['children']) {
                    this.modsService.setDirty(activeSession, iter);
                }
                node['children'] = result['data']['children'];
                this.updateHiddenFlags(activeSession);
                delete node['loading'];
                this.sessionsService.storeData();
            }
        });
    }
}

@Component({
    selector: 'netopeer-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss'],
    providers: [ModificationsService, TreeService]
})

export class ConfigComponent implements OnInit {
    title = 'Configuration';
    activeSession: Session;
    err_msg = "";
    commit_error = "";

    constructor(private sessionsService: SessionsService,
                private modsService: ModificationsService,
                private treeService: TreeService,
                private router: Router) {}

    addSession() {
        this.router.navigateByUrl('/netopeer/inventory/devices');
    }

    reloadData() {
        this.activeSession.data = null;
        if (this.activeSession.dataVisibility == 'root') {
            this.treeService.rpcGet(this.activeSession, false);
        } else {
            this.treeService.rpcGet(this.activeSession, true);
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

    cancelChanges() {
        //console.log(JSON.stringify(this.activeSession.modifications))
        this.modsService.cancelModification(this.activeSession);
        this.commit_error = "";
        this.sessionsService.storeData();
        //console.log(JSON.stringify(this.activeSession.modifications))
    }

    applyChanges() {
        this.modsService.applyModification(this.activeSession).then(result => {
            if (result['success']) {
                this.reloadData();
                this.commit_error = "";
            } else {
                this.commit_error = result['error-msg'];
            }
        })
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
        this.activeSession = this.sessionsService.getActiveSession();
        if (!this.activeSession.data) {
            this.treeService.rpcGet(this.activeSession, false);
        }
    }

    changeActiveSession(key: string) {
        this.activeSession = this.sessionsService.changeActiveSession(key);
    }
}
