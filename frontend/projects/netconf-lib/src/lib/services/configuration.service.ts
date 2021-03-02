/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Service for configuration changes
 */
import {EventEmitter, Injectable} from '@angular/core';
import {Session} from '../classes/session';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Modification} from '../classes/Modification';
import {ModificationType} from '../classes/ModificationType';

interface Modifications {
  [key: string]: Modification;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {



  modifications: Modifications = {};

  public modificationsChanged = new EventEmitter<string>();


  constructor(public http: HttpClient) {
  }

  public commitChanges(sessionKey: string): Observable<any> {
    return this.http.post<any>('/netconf/session/commit', {'key': sessionKey, 'modifications': this.modifications[sessionKey]});
  }

  createChangeModification(sessionKey: string, path: string, node: object, newValue: any) {
    // tslint:disable-next-line:triple-equals
    if (node['value'] == newValue) {
      console.log('Value did not change');
      return;
    }
    if (!this.modifications[sessionKey]) {
      this.modifications[sessionKey] = {};
    }
    this.modifications[sessionKey][path] = {
        'type': ModificationType.Change,
        'original': node['value'],
        'value': newValue,
        'data': node
    };
    console.log(this.modifications);
    this.modificationsChanged.emit(sessionKey);
  }

  discardModifications(sessionKey: string) {
    this.modifications[sessionKey] = {};
  }

}
