import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';

import { Schema } from './schema';
import { SCHEMAS } from './mock-schemas'

@Injectable()
export class SchemasService {
    constructor(private http: Http) {}

  getSchemas(): Observable<Schema[]> {
      return this.http.get('/netopeer/inventory/schemas/list')
          .map((resp: Response) => resp.json())
          .catch((err: Response | any) => Observable.throw(err));
  }

  addSchema(schema: File) {
      let headers = new Headers({'specific-content-type': ''});
      let options = new RequestOptions({ headers: headers });
      let input = new FormData();
      input.append("schema", schema);
      return this.http.post('/netopeer/inventory/schemas', input, options)
          .map((resp: Response) => resp.json())
          .catch((err: Response | any) => Observable.throw(err));
  }
}
