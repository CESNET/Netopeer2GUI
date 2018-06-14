import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError, tap, map } from 'rxjs/operators';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/do';

import { TreeService } from './tree.service';
import { Device } from '../inventory/device';
import { Session, Node, NodeSchema } from './session';

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
    constructor(private http: HttpClient, private treeService: TreeService) {
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
        this.alive(this.sessions[i].key).subscribe(resp => {
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
            activeSession.treeFilters.push(node['path']);
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
            this.rpcGetSubtree(activeSession.key, true).subscribe((result: object) => {
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
                if (result['success'] && result['data']['children'] !== undefined) {
                    for (let iter of result['data']['children']){
                        this.treeService.setDirty(activeSession, iter);
                        if (!all) {
                            activeSession.treeFilters.push(iter['path']);
                        }
                    }
                    node['children'] = result['data']['children'];
                    this.treeService.updateHiddenFlags(activeSession);
                    delete node['subtreeRoot'];
                    activeSession.dataPresence = 'all';
                    //console.log(activeSession);
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

    /**
     * Backend request to check validity of the value for the specified node.
     *
     * Accesses backend REST API GET:/netopeer/session/schema/checkvalue
     *
     * TODO check keys, uniques
     *
     * @param sessionKey Session identifier.
     * @param path Schema path of the node to check
     * @param value Value of the node to be checked
     * @returns Observable
     */
    checkValue(sessionKey: string, path: string, value: string): Observable<string[]> {
        let params = new HttpParams()
            .set('key', sessionKey)
            .set('path', path)
            .set('value', value);
        //let options = new RequestOptions();
        return this.http.get<string[]>('/netopeer/session/schema/checkvalue', { params: params })
            .pipe(
                catchError(err => Observable.throw(err))
            );
    }

    /**
     * Filter given schemas list by the information about the node's children.
     * Only the schemas which can be instantiated as child of node are kept
     * in the list.
     *
     * TODO check max-instances
     *
     * @param parent Parent node to fit the children schemas list.
     * @param schemas Schemas list to be reduced.
     */
    private filterSchemas(parent: Node, schemas: NodeSchema[]): void {
        for (let index = schemas.length - 1; index >= 0; index--) {
            if (schemas[index]['type'] & 0x18) {
                /* schema nodes that can be instantiated multiple times
                 * - lists and leaf-lists */
                continue;
            }
            if (!schemas[index]['config']) {
                /* read-only nodes cannot be instantiated */
                schemas.splice(index, 1);
                continue
            }
            /* try to find existing instance */
            let children;
            if (('children' in parent) && 'newChildren' in parent) {
                children = parent['children'].concat(parent['newChildren']);
            } else if ('children' in parent) {
                children = parent['children'];
            } else {
                children = parent['newChildren'];
            }
            for (let item of children) {
                if (parent['deleted']) {
                    continue;
                }
                if (schemas[index]['name'] == item['info']['name'] && schemas[index]['module'] == item['info']['module']) {
                    /* node is already instantiated */
                    schemas.splice(index, 1);
                    break;
                }
            }
        }
    }

    /**
     * Backend request to get list of children schemas for the given node. The
     * list is further filtered to remove nodes that cannot be created in the
     * given node (e.g. because instance is already present).
     *
     * Accesses backend REST API GET:/netopeer/session/schema
     *
     * @param sessionKey Session identifier.
     * @param node Node, whose children schema should be obtained.
     * @returns Observable
     */
    childrenSchemas(sessionKey: string, node: Node): Observable<NodeSchema[]> {
        let params = new HttpParams()
            .set('key', sessionKey)
            .set('path', node['info']['path'])
            .set('relative', 'children');
        return this.http.get<object>('/netopeer/session/schema', { params: params })
            .pipe(
                map((resp : NodeSchema[]) => resp['data']),
                tap((resp: NodeSchema[]) => this.filterSchemas(node, resp))
            );
        /*
        * map((resp: Response) => {
                let result = resp.json();
                //console.log(result)
                if (result['success']) {
                    this.filterSchemas(node, result['data']);
                    return result['data'];
                } else {
                    return [];
                }
            }).toPromise();
        * */
    }

    /**
     * Backend request to get list of values for the specific schema node.
     *
     * TODO in case of leaf-list check values of siblings
     *
     * Accesses backend REST API GET:/netopeer/session/schema/values
     *
     * @param sessionKey Session identifier.
     * @param node Node, whose possible values should be obtained.
     * @returns Observable
     */
    schemaValues(sessionKey: string, node: Node): Observable<object> {
        let params = new HttpParams()
                .set('key', sessionKey)
                .set('path', node['info']['path']);
        return this.http.get<object>('/netopeer/session/schema/values', { params: params });
    }

    /**
     * Backend request to check if the session is still alive.
     *
     * Accesses backend REST API GET:/netopeer/session/alive
     *
     * @param sessionKey Session identifier.
     * @returns Observable<string[]>
     */
    alive(sessionKey: string): Observable<string[]> {
        let params = new HttpParams()
            .set('key', sessionKey);
        return this.http.get<string[]>('/netopeer/session/alive', { params: params });
    }

    /**
     * Backend request to get the list of NETCONF capabilities of the session.
     *
     * Accesses backend REST API GET:/netopeer/session/capabilities
     *
     * @param sessionKey Session identifier.
     * @returns Observable
     */
    getCpblts(sessionKey: string): Observable<object> {
        let params = new HttpParams()
                .set('key', sessionKey);
        return this.http.get<object>('/netopeer/session/capabilities', { params: params })
            .pipe(
                catchError((err: any) => Observable.throw(err))
            );
    }

    /**
     * Backend request to get running data.
     *
     * Accesses backend REST API GET:/netopeer/session/rpcGet
     *
     * @param sessionKey Session identifier.
     * @param all Flag to get whole subtree or only one level of children
     * @param path Optional path to get the selected subtree of data.
     * @returns Observable
     */
    rpcGetSubtree(sessionKey: string, all: boolean, path: string = ""): Observable<object> { // <string[]>
        let params = new HttpParams()
                        .set('key', sessionKey)
                        .set('recursive', all.toString());
        if (path !== "") {
            params = params.append('path', path);
        }

        return this.http.get<object>('/netopeer/session/rpcGet', { params: params })
            .pipe(
                map( (response: object) => {
                    if( !response['success'] ) {
                        this.checkSession( sessionKey );
                    }
                    return response;
                }),
                catchError((err: any) => Observable.throw(err))
            );
    }

    /**
     * Backend request to get complete running data. The returned data are
     * connected with the provided session.
     *
     * Accesses backend REST API GET:/netopeer/session/rpcGet via rpcGetSubtree()
     *
     * @param session Session to work with.
     * @param all Flag to get whole subtree or only one level of children
     */
    rpcGet(session: Session, all: boolean): void {
        session.loading = true;
        delete session.data;
        this.rpcGetSubtree( session.key, all ).subscribe( result => {
            if ( result['success'] ) {
                for ( let iter of result['data'] ) {
                    this.treeService.setDirty( session, iter );
                }
                session.data = {};
                session.data['path'] = '/';
                session.data['info'] = {};
                session.data['info']['config'] = true;
                session.data['info']['path'] = '/';
                session.data['children'] = result['data'];
            }
            session.loading = false;
            this.storeSessions();
        } );
    }

    /**
     * Backend request to apply configuration changes.
     *
     * Accesses backend REST API POST:/netopeer/session/commit
     *
     * @param session Session to work with.
     * @returns Backend's response as json in Promise.
     */
    commit(session: Session): Observable<any> {
        return this.http.post('/netopeer/session/commit', {'key': session.key, 'modifications': session.modifications})
            .pipe(
                catchError((err: any) => Observable.throw(err))
            );

    }

    /**
     * Backend request to close NETCONF session. Internally handles maintenance
     * of the sessions list and selects activeSession if necessary.
     *
     * Accesses backend REST API DELETE:/netopeer/session
     *
     * @param key Session identifier.
     * @returns Backend's response as JSON in Observable.
     */
    close(key: string) {
        let params = new HttpParams()
                .set('key', key);
        // We need to use generic request, HttpClient.delete does not support sending params.
        return this.http.request('DELETE', '/netopeer/session', { params: params })
            .pipe(
                tap(resp => {
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
                    }
                }),
                catchError((err: any) => Observable.throw(err))
            )
    }

    /**
     * Backend request to create NETCONF session to the specified device.
     * Internally handles maintenance of the sessions list and activeSession value.
     *
     * Accesses backend REST API POST:/netopeer/session
     *
     * @param dev NETCONF device to connect to.
     */
    connect(dev: Device) {

        let body = {};
        if (dev.id) {
            body = {'id': dev.id};
        } else {
            body = {'name': dev.name, 'hostname': dev.hostname, 'port': dev.port, 'username': dev.username, 'password': dev.password};
            //options = new RequestOptions({body: JSON.stringify({'device': {'name': dev.name, 'hostname': dev.hostname, 'port': dev.port, 'username': dev.username, 'password': dev.password}})});
        }
        return this.http.post('/netopeer/session', body)
            .pipe(
                tap(resp => {
                    if (resp['success']) {
                        this.sessions.push(new Session(resp['session-key'], dev));
                        this.activeSession = resp['session-key'];
                        this.storeSessions();
                        localStorage.setItem('activeSession', this.activeSession);
                    }
                }),
                catchError((err: any) => Observable.throw(err))
            );
    }
}
