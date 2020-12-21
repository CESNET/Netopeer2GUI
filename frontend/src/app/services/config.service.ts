/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A service for loading configuration
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    constructor(
        private http: HttpClient
    )
    {}

    getConfig(): Observable<object> {
        return of({
            allowPasswordSaving: false
        });
    }


}
