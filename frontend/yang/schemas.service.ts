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
        this.loadSchemas();
        this.activeSchema = localStorage.getItem('activeSchema');
        if (!this.schemas) {
            this.schemas = [];
        }
        if (!this.activeSchema) {
            this.activeSchema = "";
        } else if (!(this.activeSchema in this.schemas)) {
            if (this.schemas.length) {
                this.activeSchema = this.schemas[0]['name'];
            } else {
                this.activeSchema = "";
            }
        }
    }

    storeSchemas() {
        if (this.schemas) {
            localStorage.setItem('schemas', JSON.stringify(this.schemas));
        } else {
            localStorage.removeItem('schemas');
        }
    }

    loadSchemas() {
        this.schemas = JSON.parse(localStorage.getItem('schemas'));
    }

    schemasKeys() {
        if (this.schemas) {
            return Object.keys(this.schemas);
        }
    }
/*
    getSchemaKey(schema: Schema) {
        if (!schema) {
            return null;
        } else if ('revision' in schema) {
            return schema.name + '@' + schema.revision + '.yang';
        } else {
            return schema.name + '.yang';
        }
    }
*/
    getActiveSchema(key: string = this.activeSchema): Schema {
        if (key in this.schemas) {
            return this.schemas[key];
        } else {
            return null;
        }
    }

    changeActiveSchemaKey(key: string): Schema {
        if (key && (key in this.schemas)) {
            this.activeSchema = key;
            localStorage.setItem('activeSchema', this.activeSchema);
        }
        return this.schemas[key];
    }

    getSchemas() {
        return this.http.get( '/netopeer/inventory/schemas' )
            .map(( resp: Response ) => resp.json()).toPromise();
    }

    show( key: string, schema: Schema) {
        let newSchema = true;

        if (key in this.schemas) {
            newSchema = false;
            schema = this.schemas[key];
        }

        if (!('data' in schema)) {
            let params = new URLSearchParams();
            params.set('key', key);
            let options = new RequestOptions({ search: params });
            this.http.get('/netopeer/inventory/schema', options)
                .map((resp: Response) => resp.json()).toPromise().then(result => {
                    if (result['success']) {
                        schema['data'] = result['data'];
                        this.storeSchemas();
                    }
                });
        }

        if (newSchema) {
            this.schemas[key] = schema;
            this.storeSchemas();
        }
    }

    close( key: string ) {
        let index = Object.keys( this.schemas ).indexOf( key );
        if ( this.activeSchema == key ) {
            if ( index > 0 ) {
                this.changeActiveSchemaKey( Object.keys( this.schemas )[index - 1] )
            } else if ( Object.keys( this.schemas ).length > 1 ) {
                this.changeActiveSchemaKey( Object.keys( this.schemas )[1] )
            } else {
                this.activeSchema = null;
                localStorage.removeItem('activeSchema');
            }
        }
        delete this.schemas[key];
        this.storeSchemas();
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

    rmSchema(key: string) {
        let options = new RequestOptions( { body: JSON.stringify(key) } );
        return this.http.delete( '/netopeer/inventory/schemas', options )
            .map(( resp: Response ) => resp.json() )
            .catch(( err: Response | any ) => Observable.throw( err ) );
    }
}
