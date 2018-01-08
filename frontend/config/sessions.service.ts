import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';

import { Device } from '../inventory/device';
import { Session } from './session';

@Injectable()
export class SessionsService{
    public sessions: Session[];
    public activeSession;

    constructor(private http: Http) {
        this.activeSession = localStorage.getItem('activeSession');
        if (!this.activeSession) {
            this.activeSession = "";
        }
        this.checkSessions();
    }

    storeData() {
        localStorage.setItem('sessions', JSON.stringify(this.sessions));
    }

    getActiveSession(key: string = this.activeSession): Session {
        if (!key) {
            return null;
        }
        for (let i = this.sessions.length; i > 0; i--) {
            if (this.sessions[i - 1].key == key) {
                return this.sessions[i - 1];
            }
        }
        return null;
    }

    changeActiveSession(key: string): Session {
        if (!this.activeSession) {
            return null;
        }
        let result = this.getActiveSession(key);
        if (result) {
            this.activeSession = key;
            localStorage.setItem('activeSession', this.activeSession);
        }
        return result;
    }

    checkSessions() {
        this.sessions = JSON.parse(localStorage.getItem('sessions'));
        if (!this.sessions) {
            this.sessions = [];
        } else {
            /* verify that the sessions are still active */
            for (let i = this.sessions.length; i > 0; i--) {
                this.alive(this.sessions[i - 1].key).subscribe(resp => {
                    if (!resp['success']) {
                        if (this.activeSession && this.sessions[i - 1].key == this.activeSession) {
                            /* active session is not alive - select new active session
                             * as the one on the left from the current one, if there
                             * is no one, choose the one on the right */
                            if (i > 1) {
                                this.activeSession = this.sessions[i - 2].key;
                            } else if (this.sessions.length > i) {
                                this.activeSession = this.sessions[i].key;
                            } else {
                                this.activeSession = "";
                            }
                        }
                        this.sessions.splice(i - 1, 1);
                    }
                });
            }
        }
    }

    checkValue(key: string, path: string, value: string): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        params.set('path', path);
        params.set('value', value);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/element/checkvalue', options)
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
    }

    alive(key: string): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/alive', options)
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
    }

    getCpblts(key: string): Observable<string[]> {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({ search: params });
        return this.http.get('/netopeer/session/capabilities', options)
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
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
            .map((resp: Response) => resp.json())
            .catch((err: Response | any) => Observable.throw(err));
    }

    close(key: string) {
        let params = new URLSearchParams();
        params.set('key', key);
        let options = new RequestOptions({search: params});
        return this.http.delete('/netopeer/session', options)
            .map((resp: Response) => resp.json())
            .do(resp => {
                if (resp['success']) {
                    this.sessions.splice(this.sessions.findIndex((s: Session) => s.key == key), 1);
                    if (key == this.activeSession) {
                        if (this.sessions.length) {
                            this.activeSession = this.sessions[0].key;
                        } else {
                            this.activeSession = ""
                        }
                    }
                    localStorage.setItem('sessions', JSON.stringify(this.sessions));
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
                    localStorage.setItem('sessions', JSON.stringify(this.sessions));
                    localStorage.setItem('activeSession', this.activeSession);
                }
            })
            .catch((err: Response | any) => Observable.throw(err))
    }
}
