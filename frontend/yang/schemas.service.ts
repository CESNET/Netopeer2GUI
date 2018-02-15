import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';

import { Schema } from '../inventory/schema';

@Injectable()
export class SchemasService {
    public schemas: Schema[];
    public activeSchema: string;

    constructor( private http: Http ) {
        this.loadData();
        this.activeSchema = localStorage.getItem('activeSchema');
        if (!this.activeSchema) {
            this.activeSchema = "";
            this.schemas = [];
        }
    }

    storeData() {
        localStorage.setItem('schemas', JSON.stringify(this.schemas));
    }

    loadData() {
        this.schemas = JSON.parse(localStorage.getItem('schemas'));
    }

    getActiveSchema(key: string = this.activeSchema): Schema {
        if (!key) {
            return null;
        }
        for (let i = this.schemas.length; i > 0; i--) {
            if (this.schemas[i - 1].key == key) {
                return this.schemas[i - 1];
            }
        }
        return null;
    }

    changeActiveSchema(key: string): Schema {
        let result = this.getActiveSchema(key);
        if (result) {
            this.activeSchema = key;
            localStorage.setItem('activeSession', this.activeSchema);
        }
        return result;
    }

    getSchemas() {
        return this.http.get( '/netopeer/inventory/schemas' )
            .map(( resp: Response ) => resp.json()).toPromise();
    }

    show(schema: Schema) {
        let newSchema = true;
        for (let i in this.schemas) {
            if (this.schemas[i].key == schema.key) {
                schema = this.schemas[i];
                newSchema = false;
                break;
            }
        }

        if (!('data' in schema)) {
            let params = new URLSearchParams();
            params.set('key', schema.key);
            let options = new RequestOptions({ search: params });
            this.http.get('/netopeer/inventory/schema', options)
                .map((resp: Response) => resp.json()).toPromise().then(result => {
                    console.log(result)
                    if (result['success']) {
                        schema['data'] = result['data'];
                        this.storeData();
                        console.log(this.schemas)
                    }
                });
        }

        if (newSchema) {
            this.schemas.push(schema);
            this.storeData();
        }
    }

    addSchema( schema: File ) {
        let headers = new Headers( { 'specific-content-type': '' } );
        let options = new RequestOptions( { headers: headers } );
        let input = new FormData();
        input.append( "schema", schema );
        return this.http.post( '/netopeer/inventory/schemas', input, options )
            .map(( resp: Response ) => resp.json() )
            .catch(( err: Response | any ) => Observable.throw( err ) );
    }

    rmSchema( schema: Schema ) {
        let options = new RequestOptions( { body: JSON.stringify(schema.key) } );
        return this.http.delete( '/netopeer/inventory/schemas', options )
            .map(( resp: Response ) => resp.json() )
            .catch(( err: Response | any ) => Observable.throw( err ) );
    }
}
