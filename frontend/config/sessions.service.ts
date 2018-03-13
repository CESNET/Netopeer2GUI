import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';

import { TreeService } from './tree.service';
import { Device } from '../inventory/device';
import { Session } from './session';

/**
 * Service to control NETCONF sessions.
 * 
 * The class maintain list of sessions by using localStorage.
 */
@Injectable()
export class SessionsService {
    /** List of opened NETCONF sessions. */
    public sessions: Session[];
    /** Identifier of the currently active session. */
    public activeSession: string;

    /**
     * Initiate internal data.
     * @param http Handler to communicate with the backend.
     * @param treeService Handler to control data tree.
     */
    constructor(private http: Http, private treeService: TreeService) {
        this.activeSession = localStorage.getItem('activeSession');
        if (!this.activeSession) {
            this.activeSession = "";
        }
        this.checkSessions();
    }

    /**
     * Store the sessions list into localStorage for later use / reload. Does
     * not store activeSession identifier, which is handled separately because
     * of its possible more frequent change.
     */
    storeSessions(): void {
        localStorage.setItem('sessions', JSON.stringify(this.sessions));
    }

    /**
     * Load the sessions list from localStorage.
     */
    loadSessions(): void {
        this.sessions = JSON.parse(localStorage.getItem('sessions'));
        if (!this.sessions) {
            this.sessions = [];
        }
        for (let session of this.sessions) {
            /* fix links in modifications data to link the currently reloaded objects */
            for (let mod in session.modifications) {
                if ('data' in session.modifications[mod]) {
                    session.modifications[mod]['data'] = this.treeService.pathNode(session, mod);
                }
            }
        }
    }

    /**
     * Get Session according to the specified key. If no key is specified, the
     * current activeSession is returned.
     * @param key Identifier of the session.
     * @returns The session corresponding to the given key or null in case no
     * such session exists.
     */
    getSession(key: string = this.activeSession): Session {
        if (key) {
            for (let i = this.sessions.length; i > 0; i--) {
                if (this.sessions[i - 1].key == key) {
                    return this.sessions[i - 1];
                }
            }
        }
        return null;
    }

    /**
     * Change the current activeSession.
     * @param key Identifier of the session supposed to became activeSession
     * @returns The new activeSession object.
     */
    changeActiveSession(key: string): Session {
        let result = this.getSession(key);
        if (result) {
            this.activeSession = key;
            localStorage.setItem('activeSession', this.activeSession);
        }
        return result;
    }

    /**
     * Check with backend that session on the specific index in the sessions
     * list is still alive.
     * @param i Index of the session to check in the sessions list.
     */
    private checkSessionIndex(i: number): void {
        this.alive(this.sessions[i].key).then(resp => {
            if (!resp['success']) {
                if (this.activeSession && this.sessions[i].key == this.activeSession) {
                    /* active session is not alive - select new active session
                     * as the one on the left from the current one, if there
                     * is no one, choose the one on the right */
                    if (i > 0) {
                        this.activeSession = this.sessions[i - 1].key;
                    } else if (i + 1 < this.sessions.length) {
                        this.activeSession = this.sessions[i + 1].key;
                    } else {
                        this.activeSession = "";
                    }
                    localStorage.setItem('activeSession', this.activeSession);
                }
                this.sessions.splice(i, 1);
                this.storeSessions();
            }
        });
    }

    /**
     * Check with backend that the session with the given key is still alive.
     * @param key Identifier of the session to check.
     */
    private checkSession(key: string): void {
        for (let i in this.sessions) {
            if (this.sessions[i].key == key) {
                this.checkSessionIndex(Number(i));
                break;
            }
        }
    }

    /**
     * Check all the sessions if they are still alive. If not, the session is
     * removed from the list and if it was activeSession, the new one is
     * selected.
     */
    checkSessions(): void {
        this.loadSessions();
        /* verify that the sessions are still active */
        for (let i = this.sessions.length; i > 0; i--) {
            this.checkSessionIndex(i - 1);
        }
    }

    /**
     * Hide a data subtree from view. Hiding is done via set of filters taken
     * into account in tree-node template.
     * @param activeSession Session to work with.
     * @param node Root of the subtree to hide, this node is the last visible node.
     */
    collapse(activeSession: Session, node: Node = null ): void {
        if (node) {
            for (let i = activeSession.treeFilters.length; i > 0; i--) {
                if (activeSession.treeFilters[Number(i) - 1].startsWith(node['path'])) {
                    activeSession.treeFilters.splice(Number(i) - 1, 1);
                }
            }
            activeSession.treeFilters.push(node['path'])
            activeSession.dataPresence = 'mixed';
        } else {
            activeSession.treeFilters = [];
            if (activeSession.data) {
                for (let root of activeSession.data['children']) {
                    if ('subtreeRoot' in root) {
                        continue;
                    }
                    activeSession.treeFilters.push(root['path']);
                }
            }
            activeSession.dataPresence = 'root';
        }
        this.treeService.updateHiddenFlags( activeSession );
        this.storeSessions();
    }

    /**
     * Show currently not visited data subtree.
     * There are 2 situations why a subtree is not visible. a) It was previously
     * collapsed and now it is filtered out via filters. b) It was not loaded
     * yet - at the beginning, only the data roots are loaded from backend and
     * it is up to user to select subtrees to work with. At that moment the
     * complete subtree is loaded from backend even in case the user expanded
     * only one level of children (so in such a case standard collapse filters
     * are set).
     * @param activeSession Session to work with.
     * @param node Node to expand, null in case of root node.
     * @param all Flag if all levels of children should be expanded or just one.
     */
    expand(activeSession: Session, node: Node = null, all: boolean = true): void {
        if (!node) {
            /* root */
            let backup = activeSession.data;
            activeSession.data = null;
            delete backup['children'];
            activeSession.loading = true;
            this.rpcGetSubtree(activeSession.key, true).subscribe(result => {
                if (result['success']) {
                    for (let iter of result['data']) {
                        this.treeService.setDirty( activeSession, iter );
                    }
                    activeSession.data = backup;
                    activeSession.data['children'] = result['data'];
                    activeSession.loading = false;
                    activeSession.dataPresence = 'all';
                    activeSession.treeFilters = [];
                    this.storeSessions();
                }
            });
        } else if ('subtreeRoot' in node) {
            node['loading'] = true;
            this.rpcGetSubtree(activeSession.key, true, node['path']).subscribe(result => {
                delete node['loading'];
                if (result['success']) {
                    for (let iter of result['data']['children']) {
                        this.treeService.setDirty(activeSession, iter);
                        if (!all) {
                            activeSession.treeFilters.push(iter['path']);
                        }
                    }
                    node['children'] = result['data']['children'];
                    this.treeService.updateHiddenFlags(activeSession);
                    delete node['subtreeRoot'];
                    activeSession.dataPresence = 'all';
                    for (let root of activeSession.data['children']) {
                        if ('subtreeRoot' in root) {
                            activeSession.dataPresence = 'mixed';
                            break;
                        }
                    }
                    this.storeSessions();
                }
            } );
        } else {
            let index = activeSession.treeFilters.indexOf(node['path']);
            if (index != -1) {
                activeSession.treeFilters.splice(index, 1);
            } else {
                for (let i = activeSession.treeFilters.length; i > 0; i--) {
                    if (activeSession.treeFilters[Number(i) - 1].startsWith(node['path'])) {
                        activeSession.treeFilters.splice(Number(i) - 1, 1);
                    }
                }
            }
            if (!all && ('children' in node)) {
                for (let child of node['children']) {
                    activeSession.treeFilters.push(child['path'])
                }
            }
            this.treeService.updateHiddenFlags(activeSession);
            this.storeSessions();
        }
    }

    checkValue(key: string, path: string, value: string): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        params.set('path', path);
        params.set('value', value);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/schema/checkvalue', options)
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
    }

    private filterSchemas(node, schemas) {
        if (node['deleted'] || (node['info']['type'] & 0x18)) {
            /* ignore deleted nodes and nodes that can be instantiated multiple times */
            return;
        }
        for (let index in schemas) {
            if (!schemas[index]['config'] ||
                    (schemas[index]['name'] == node['info']['name'] && schemas[index]['module'] == node['info']['module'])) {
                /* 1. read-only node */
                /* 2. the node is already instantiated */
                schemas.splice(index, 1);
            }
        }
    }

    childrenSchemas(key: string, path: string, node = null) {
        let params = new URLSearchParams();
        params.set('key', key);
        params.set('path', path);
        params.set('relative', 'children');
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/schema', options)
            .map((resp: Response) => {
                let result = resp.json();
                //console.log(result)
                if (result['success'] && node) {
                    if ('children' in node) {
                        for (let iter of node['children']) {
                            this.filterSchemas(iter, result['data']);
                        }
                    }
                    if ('newChildren' in node) {
                        for (let iter of node['newChildren']) {
                            this.filterSchemas(iter, result['data']);
                        }
                    }
                }
                if (result['success']) {
                    return result['data'];
                } else {
                    return [];
                }
            }).toPromise();
    }

    schemaValues(key: string, path: string) {
        let params = new URLSearchParams();
        params.set('key', key);
        params.set('path', path);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/schema/values', options)
            .map((resp: Response) => resp.json()).toPromise();
    }

    alive(key: string): Promise<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/alive', options)
            .map((resp: Response) => resp.json()).toPromise();
    }

    getCpblts(key: string): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/capabilities', options)
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
    }

    setDirty(node) {
        let activeSession = this.getSession();
        if (!activeSession.modifications) {
            return;
        }

        if (node['path'] in activeSession.modifications) {
            node['dirty'] = true;
            if (activeSession.modifications[node['path']]['type'] == 'change') {
                activeSession.modifications[node['path']]['original'] = node['value'];
            }
            node['value'] = activeSession.modifications[node['path']]['value']; 
        }
        /* recursion */
        if ('children' in node) {
            for (let child of node['children']) {
                this.setDirty(child);
            }
        }
    }

    rpcGetSubtree(key: string, all: boolean, path: string = ""): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        params.set('recursive', String(all));
        if (path.length) {
            params.set('path', path);
        }
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/rpcGet', options)
            .map((resp: Response) => {
                console.log(resp);
                let result = resp.json();
                if (!result['success']) {
                    this.checkSession(key);
                }
                return result;
            })
            .catch((err: Response | any) => Observable.throw(err));
    }

    rpcGet(activeSession: Session, all: boolean) {
        activeSession.loading = true;
        delete activeSession.data;
        this.rpcGetSubtree( activeSession.key, all ).subscribe( result => {
            if ( result['success'] ) {
                for ( let iter of result['data'] ) {
                    this.treeService.setDirty( activeSession, iter );
                }
                activeSession.data = {};
                activeSession.data['path'] = '/';
                activeSession.data['info'] = {};
                activeSession.data['info']['config'] = true;
                activeSession.data['info']['path'] = '/';
                activeSession.data['children'] = result['data'];
            }
            activeSession.loading = false;
            this.storeSessions();
        } );
    }

    commit(key: string) {
        let activeSession = this.getSession(key);
        let options = new RequestOptions({body: JSON.stringify({'key': key, 'modifications': activeSession.modifications})});
        return this.http.post('/netopeer/session/commit', null, options)
            .map((resp: Response) => resp.json()).toPromise();
    }

    close(key: string) {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({search: params});
        return this.http.delete('/netopeer/session', options)
            .map((resp: Response) => resp.json())
            .do(resp => {
                if (resp['success']) {
                    let index = this.sessions.findIndex((s: Session) => s.key == key);
                    this.sessions.splice(index, 1);
                    if (key == this.activeSession) {
                        if (index > 0) {
                            this.activeSession = this.sessions[index - 1].key;
                        } else if (this.sessions.length) {
                            this.activeSession = this.sessions[0].key;
                        } else {
                            this.activeSession = ""
                        }
                    }
                    this.storeSessions();
                    localStorage.setItem('activeSession', this.activeSession);
                }
            })
            .catch((err: Response | any) => Observable.throw(err));
    }

    connect(dev: Device) {
        let options = null; // = new RequestOptions({body: JSON.stringify({'id': dev.id})});
        if (dev.id) {
            options = new RequestOptions({body: JSON.stringify({'id': dev.id})});
        } else {
            options = new RequestOptions({body: JSON.stringify({'device': {'hostname': dev.hostname, 'port': dev.port, 'username': dev.username, 'password': dev.password}})});
        }
        return this.http.post('/netopeer/session', null, options)
            .map((resp: Response) => resp.json())
            .do(resp => {
                if (resp['success']) {
                    this.sessions.push(new Session(resp['session-key'], dev));
                    this.activeSession = resp['session-key'];
                    this.storeSessions();
                    localStorage.setItem('activeSession', this.activeSession);
                }
            })
            .catch((err: Response | any) => Observable.throw(err))
    }
}
