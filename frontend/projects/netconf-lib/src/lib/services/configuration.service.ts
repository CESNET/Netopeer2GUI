/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Service for configuration changes
 */
import {Injectable} from '@angular/core';
import {Session} from '../classes/session';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  constructor(public http: HttpClient) {
  }

  public commitChanges(session: Session): Observable<any> {
    console.log('Modifications: ');
    console.log(session.modifications);
    return this.http.post<any>('/netconf/session/commit', {'key': session.key, 'modifications': session.modifications});
  }

}
