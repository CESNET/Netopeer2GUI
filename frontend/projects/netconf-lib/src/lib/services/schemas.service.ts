/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Load, upload and parse schemas
 */

import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {GenericServerResponse} from '../classes/GenericServerResponse';

@Injectable({
  providedIn: 'root'
})
export class SchemasService {

  constructor(private http: HttpClient) { }

  static newlineToBr(message: string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '/': '&#x2F;'
    };
    return message.replace(/[&<>\/]/g, s => entityMap[s])
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;');
  }

  static formatYang(message: string) {
    const chars = [...message]; // Split message to chars in unicode-safe way

    let bracketPos = 0;
    let stringFlag = false;
    let patternFlag = false;
    let result = '';
    let idx = 0;
    for (const c of chars) {
      switch (c) {
        case '{':
          if (!stringFlag && !patternFlag) {
            bracketPos++;
            result += c + '<div class="level">';
          } else {
            result += c;
          }
          break;
        case '}':
          if (!stringFlag && !patternFlag) {
            bracketPos--;
            result += '</div>' + c;
          } else {
            result += c;
          }
          break;
        case '"':
          if (stringFlag) {
            result += c + '</span>';
          } else {
            result += '<span class="string">' + c;
          }
          stringFlag = !stringFlag;
          break;
        case '\'':
          if (!stringFlag) {
            if (patternFlag) {
              result += c + '</span>';
            } else {
              result += '<span class="pattern">' + c;
            }
            patternFlag = !patternFlag;
          } else {
            result += c;
          }
          break;
        default:
          result += c;
          break;
      }
      idx++;
    }
    return result;
  }

  getSchemaNames(): Observable<string[]> {
    return this.http.get<string[]>('/netconf/schemas');
  }

  getSchema(schemaName: string): Observable<string> {
    return this.http.get<string>('/netconf/schema/' + schemaName);
  }

  getParsedSchema(schemaName: string, sessionKey: string, path: string = null): Observable<object> {
    const params = new HttpParams()
      .set('session', sessionKey)
      .set('path', path);
    return this.http.get<object>('/netconf/schemaParsed/' + schemaName, {params: params});
  }

  removeSchema(schemaName: string): Observable<GenericServerResponse> {
    return this.http.delete<GenericServerResponse>('/netconf/schema/' + schemaName);
  }


}
