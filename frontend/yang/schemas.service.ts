import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError } from "rxjs/operators";
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';

import { Schema } from '../inventory/schema';

@Injectable()
export class SchemasService {
    public schemas: Schema[];
    public activeSchema: string;
    public history;

    constructor( private http: HttpClient ) {
        this.loadSchemas();
        this.activeSchema = localStorage.getItem('activeSchema');
        if (!this.schemas) {
            this.schemas = [];
        }
        if (!this.activeSchema) {
            this.activeSchema = "";
        } else if (!this.getSchema(this.activeSchema)) {
            if (this.schemas.length) {
                this.activeSchema = this.schemas[0]['name'];
            } else {
                this.activeSchema = "";
            }
        }
    }

    storeSchemas(): void {
        if (this.schemas) {
            localStorage.setItem('schemas', JSON.stringify(this.schemas));
        } else {
            localStorage.removeItem('schemas');
        }

        localStorage.setItem('YEHistory', JSON.stringify(this.history));
    }

    loadSchemas(): void {
        this.schemas = JSON.parse(localStorage.getItem('schemas'));
        this.history = JSON.parse(localStorage.getItem('YEHistory'));
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
    getSchema(key: string = this.activeSchema): Schema {
        if (key) {
            for (let i = this.schemas.length; i > 0; i--) {
                if (this.schemas[i - 1].key == key) {
                    return this.schemas[i - 1];
                }
            }
        }
        return null;
    }

    getActiveSchema(key: string = this.activeSchema): Schema {
        return this.getSchema();
    }

    changeActiveSchemaKey(key: string): Schema {
        let result = this.getSchema(key);
        if (result) {
            this.activeSchema = key;
            localStorage.setItem('activeSchema', this.activeSchema);
        }
        return result;
    }

    getSchemas(): Observable<object> {
        return this.http.get( '/netopeer/inventory/schemas' );
    }

    show(key: string, schema: Schema = null, type: string = 'text', path: string = null) {
        let newSchema = true;
        let present = this.getSchema(key);
        if (present) {
            schema = present;
            newSchema = false;
        } else {
            schema = new Schema(key);
        }

        if (!schema.data || schema.type != type || type != 'text') {
            let params = new HttpParams()
                .set('key', key)
                .set('type', type);
            if (path) {
                params = params.set('path', path);
            }
            this.http.get<object>('/netopeer/inventory/schema', {params: params})
                .subscribe((result: object) => {
                    if (result['success']) {
                        schema.name = result['name'];
                        if ('revision' in result) {
                            schema.revision = result['revision'];
                        }
                        schema.type = type;
                        schema.data = result['data'];
                        this.history.push({key, type, path});
                        this.storeSchemas();
                    }
                });
        }

        if (newSchema) {
            this.schemas.push(schema);
            this.storeSchemas();
        }
    }

    close( key: string ) {
        let index = this.schemas.findIndex((s: Schema) => s.key == key);
        if ( this.activeSchema == key ) {
            if ( index > 0 ) {
                this.changeActiveSchemaKey(this.schemas[index - 1].key);
            } else if (Object.keys(this.schemas).length > 1) {
                this.changeActiveSchemaKey(this.schemas[1].key);
            } else {
                this.activeSchema = null;
                localStorage.removeItem('activeSchema');
            }
        }
        this.schemas.splice(index, 1);
        this.storeSchemas();
    }

    addSchema( schema: File ) {
        let headers = new HttpHeaders( { 'specific-content-type': '' } );
        let input = new FormData();
        input.append( "schema", schema );
        return this.http.post<object>( '/netopeer/inventory/schemas', input, { headers: headers } )
            .pipe(
                catchError((err: any) => Observable.throwError(err))
            )
    }

    rmSchema(key: string) {

        return this.http.request('DELETE', '/netopeer/inventory/schemas', { body: JSON.stringify(key)})
            .pipe(
                catchError((err: any) => Observable.throwError(err))
            )
    }
}
