import { Component, Input, Output, OnInit, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

import { SchemasService } from './schemas.service';
import { Schema } from '../inventory/schema';

import { NoPrefixPipe, PrefixOnlyPipe } from '../common/pipes';

@Component( {
    selector: 'yang-module',
    templateUrl: './yang.module.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGModule implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Output() refresh = new EventEmitter();
    data: any;

    constructor(public schemasService: SchemasService) {}

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
    selector: 'yang-identity',
    templateUrl: './yang.identity.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGIdentity implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Output() refresh = new EventEmitter();
    data: any;
    name: string;

    constructor(public schemasService: SchemasService) {}

    base(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = id.slice(i + 1);
        this.schemasService.show(key, null, 'tree-identity', path);
        this.schemasService.changeActiveSchemaKey(key);
        this.refresh.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.ngOnInit();
    }

    ngOnInit(): void {
        this.name = Object.keys(this.schema.data)[0]
        this.data = this.schema.data[this.name];
    }
}

@Component( {
    selector: 'yang-typedef',
    templateUrl: './yang.typedef.html',
    styleUrls: ['./yang.component.scss']
} )
export class YANGTypedef implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Input() data: any;
    @Output() refresh = new EventEmitter();
    name: string;

    constructor() {}

    onRefresh() {
        this.refresh.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        console.log("change detected")
        this.ngOnInit();
    }

    ngOnInit(): void {
        this.name = Object.keys(this.data)[0]
    }
}

@Component( {
    selector: 'yang-type',
    templateUrl: './yang.type.html',
    styleUrls: ['./yang.component.scss']
} )
export class YANGType {
    @Input() data: any;
    @Output() refresh = new EventEmitter();

    constructor(public schemasService: SchemasService) {}

    derivedFrom(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = id.slice(i + 1);
        this.schemasService.show(key, null, 'tree-typedef', path);
        this.schemasService.changeActiveSchemaKey(key);
        this.refresh.emit();
    }

    onRefresh() {
        this.refresh.emit();
    }

    base(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = id.slice(i + 1);
        this.schemasService.show(key, null, 'tree-identity', path);
        this.schemasService.changeActiveSchemaKey(key);
        this.refresh.emit();
    }
}

@Component( {
    selector: 'yang-restriction',
    template: `
        <div class="yang-info"><span class="yang-info-subsection-label">{{name}}</span><span class="yang-info-value">{{data.value}}</span></div>
        <div class="yang-info-subsection">
            <div class="yang-info" *ngIf="data.modifier">
                <span class="yang-info-label">modifier</span><span class="yang-info-value">{{data.modifier.value}}</span>
            </div>
            <div class="yang-info" *ngIf="data.error-message">
                <span class="yang-info-label">error-message</span><span class="yang-info-value">{{data['error-message'].value}}</span>
            </div>
            <div class="yang-info" *ngIf="data.error-app-tag">
                <span class="yang-info-label">error-app-tag</span><span class="yang-info-value">{{data['error-app-tag'].value}}</span>
            </div>
            <div class="yang-info" *ngIf="data.description">
                <span class="yang-info-label">description</span><pre class="yang-info-value">{{data.description.text}}</pre>
            </div>
            <div class="yang-info" *ngIf="data.reference">
                <span class="yang-info-label">reference</span><pre class="yang-info-value">{{data.reference.text}}</pre>
            </div>
        </div>`,
    styleUrls: ['./yang.component.scss']
} )
export class YANGRestriction {
    @Input() data: any;
    @Input() name: string;
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

    schemaData(schema: Schema) {
        return schema.data[Object.keys(schema.data)[0]]
    }

    addSchema() {
        this.router.navigateByUrl( '/netopeer/inventory/schemas' );
    }
}
