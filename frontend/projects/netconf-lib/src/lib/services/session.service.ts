/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Handle device sessions
 */

import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {GenericServerResponse} from '../classes/GenericServerResponse';
import {Session} from '../classes/session';
import {Device} from '../classes/device';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {ModificationType} from '../classes/ModificationType';


@Injectable({
  providedIn: 'root'
})
export class SessionService {

  get sessions(): Session[] {
    return this._sessions;
  }

  set sessions(value: Session[]) {
    console.log('Sessions changed!');
    console.log(value);
    this._sessions = value;
    this.sessionsChanged.emit(value);
  }

  constructor(public http: HttpClient) {
  }

  private _sessions: Session[] = [];

  public sessionsChanged: EventEmitter<Session[]> = new EventEmitter<Session[]>();
  public modificationAdded: EventEmitter<Session> = new EventEmitter<Session>();

  addSession(key: string, device: Device) {
    if (!this.doesSessionExists(key)) {
      const sessions = this.sessions;
      sessions.push({
        key, device, modifications: {}
      });
      this.sessions = sessions;
    } else {
      const idx = this.findSessionIndex(key);
      this._sessions[idx].device = device;
      this.sessionsChanged.emit(this.sessions);
    }
  }


  destroySession(key: string) {
    const idx = this.findSessionIndex(key);
    return this.http.delete('/netconf/session/' + key)
      .pipe(
        tap(
          next => {
            this._sessions.splice(idx, 1);
            this.sessionsChanged.emit(this.sessions);
          }
        )
      );
  }

  loadOpenSessions(): Observable<Session[]> {
    return this.http.get<Session[]>('/netconf/sessions');
  }

  destroyAllSessions() {
    return this.http.delete('/netconf/sessions');
  }

  /**
   *  Check if session exists on the server.
   */
  sessionAlive(key: string): Observable<GenericServerResponse> {
    /*const params = new HttpParams()
      .append('key', key);*/
    return this.http.get<GenericServerResponse>('/netconf/session/alive/' + key);
  }


  doesSessionExists(key: string): Boolean {
    for (const session of this._sessions) {
      if (session.key === key) {
        return true;
      }
    }
    return false;
  }

  findSessionIndex(key: string): number {
    return this._sessions.findIndex(s => s.key === key);
  }

  /**
   * Path is xpath.
   * For more information see https://netopeer.liberouter.org/doc/libyang/devel/howtoxpath.html
   */
  public getCompatibleDeviceSessions(path: any): Observable<Session[]> {
    if (this.sessions.length === 0) {
      return this.loadOpenSessions();
    } else {
      return of(this.sessions);
    }

  }

  /**
   * Format of path is described in detail here: https://netopeer.liberouter.org/doc/libyang/devel/howtoxpath.html
   * When no path is provided, the whole tree is requested
   */
  public rpcGet(sessionKey: string, recursive: boolean, path?: string, forceReload = false) {
    const idx = this.findSessionIndex(sessionKey);
    if (!forceReload && idx >= 0
      && this.sessions[idx]
      && this.sessions[idx].data
      && Object.keys(this.sessions[idx].data).length > 0
      && !path) {
      // TODO: Find path
      return of(this.sessions[idx].data);
    } else {
      const params = new HttpParams()
        .append('key', sessionKey)
        .append('recursive', recursive ? 'true' : 'false');
      if (path) {
        params.append('path', path);
      }
      return this.http.get('/netconf/session/rpcGet', {params});
    }

  }

  createChangeModification(sessionKey: string, path: string, node: object, newValue: string) {
    if (node['value'] == newValue) {
      // No change
      console.log('Value did not change');
      return;
    }
    const idx = this.findSessionIndex(sessionKey);
    if (idx < 0) {
      console.warn('Session "' + sessionKey + '" not found');
      return;
    }
    if (!this.sessions[idx].modifications) {
      this.sessions[idx].modifications = {};
    }
    this.sessions[idx].modifications[path] = {
      'type': ModificationType.Change,
      'original': node['value'],
      'value': newValue,
      'data': node
    };
    this.modificationAdded.emit(this.sessions[idx]);
  }

  discardModifications(sessionKey: string) {
    const idx = this.findSessionIndex(sessionKey);
    if (idx > 0) {
      this.sessions[idx].modifications = {};
    }

  }

}
