import { Component, Input, Output, OnInit, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

import { SchemasService } from './schemas.service';
import { Schema } from '../inventory/schema';

@Component( {
    selector: 'yang-module',
    templateUrl: './yang.module.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGModule implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Output() refresh = new EventEmitter();
    data: any;

    constructor(public schemasService: SchemasService, private router: Router) {}

    getKeys(object: Object) {
        return Object.keys(object);
    }

    section(name: string, set: any = null) {
        let i = this.schema.sections.indexOf(name);
        if (set == null) {
            if (i < 0) {
                return false;
            } else {
                return true;
            }
        } else if (set && i == -1) {
            this.schema.sections.push(name);
        } else if (!set && i != -1) {
            this.schema.sections.splice(i, 1);
        }
        this.schemasService.storeSchemas();
    }

    link(key: string, type: string = 'tree', path: string = null) {
        this.schemasService.show(key, null, type, path);
        this.schemasService.changeActiveSchemaKey(key);
        this.refresh.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.data = this.schema.data[Object.keys(this.schema.data)[0]];
    }

    ngOnInit(): void {
        this.data = this.schema.data[Object.keys(this.schema.data)[0]];
    }
}


@Component( {
    selector: 'netopeer-yang',
    templateUrl: './yang.component.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGComponent {
    title = 'YANG Explorer';
    activeSchema: Schema = null;

    constructor(private router: Router, public schemasService: SchemasService ) {
        this.refreshActiveSchema();
    }

    refreshActiveSchema() {
        this.activeSchema = this.schemasService.getSchema(this.schemasService.activeSchema);
    }

    addSchema() {
        this.router.navigateByUrl( '/netopeer/inventory/schemas' );
    }
}
