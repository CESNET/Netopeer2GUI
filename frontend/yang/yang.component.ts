import { Component, Input, Output, OnInit, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

import { SchemasService } from './schemas.service';
import { Schema } from '../inventory/schema';

import { NoPrefixPipe, PrefixOnlyPipe, PatternHighlightPipe } from '../common/pipes';

class iffItem {
    constructor(
        public type:string,
        public content:string,
        public key:string = null,
        public path: string = null
    ) {}
}

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
        this.schemasService.show(key, type, path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                }
            });
    }

    onRefresh() {
        this.refresh.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.ngOnInit();
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
        let path = '/' + id.slice(i + 1);
        this.schemasService.show(key, 'tree-identity', path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                    this.ngOnInit();
                }
            });
    }

    onRefresh() {
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
    selector: 'yang-feature',
    templateUrl: './yang.feature.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGFeature implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Output() refresh = new EventEmitter();
    data: any;
    name: string;

    constructor(public schemasService: SchemasService) {}

    onRefresh() {
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
        this.ngOnInit();
    }

    ngOnInit(): void {
        this.name = Object.keys(this.schema.data)[0]
    }
}

@Component( {
    selector: 'yang-type',
    templateUrl: './yang.type.html',
    styleUrls: ['./yang.component.scss']
} )
export class YANGType {
    @Input() schema: Schema;
    @Input() data: any;
    @Input() typedef: boolean = true;
    @Output() refresh = new EventEmitter();

    constructor(public schemasService: SchemasService) {}

    derivedFrom(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = '/' + id.slice(i + 1);
        this.schemasService.show(key, 'tree-typedef', path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                }
            });
    }

    onRefresh() {
        this.refresh.emit();
    }

    base(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = '/' + id.slice(i + 1);
        this.schemasService.show(key, 'tree-identity', path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                }
            });
    }

    linkNode( key: string, path: string ) {
        this.schemasService.show(key + '.yang', 'tree-node', path)
            .subscribe(( result: object ) => {
                if ( result['success'] ) {
                    this.refresh.emit();
                }
            } );
    }
}

@Component( {
    selector: 'yang-restriction',
    template: `
        <div class="yang-info" *ngIf="name=='pattern'"><span class="yang-info-subsection-label">{{name}}</span><span class="yang-info-value pattern" [innerHTML]="data.value | patternHighlight"></span></div>
        <div class="yang-info" *ngIf="name!='pattern'"><span class="yang-info-subsection-label">{{name}}</span><span class="yang-info-value">{{data.value}}</span></div>
        <div class="yang-info-subsection">
            <div class="yang-info" *ngIf="data.modifier">
                <span class="yang-info-label">modifier</span><span class="yang-info-value">{{data.modifier.value}}</span>
            </div>
            <div class="yang-info" *ngIf="data['error-message']">
                <span class="yang-info-label">error-message</span><span class="yang-info-value">{{data['error-message'].value}}</span>
            </div>
            <div class="yang-info" *ngIf="data['error-app-tag']">
                <span class="yang-info-label">error-app-tag</span><span class="yang-info-value">{{data['error-app-tag'].value}}</span>
            </div>
            <div class="yang-info" *ngIf="data.description">
                <span class="yang-info-label">description</span><pre class="yang-info-value">{{data.description.text}}</pre>
            </div>
            <div class="yang-info" *ngIf="data.reference">
                <span class="yang-info-label">reference</span><pre class="yang-info-value">{{data.reference.text}}</pre>
            </div>
        </div>`,
    styleUrls: ['./yang.component.scss'],
    encapsulation: ViewEncapsulation.None,
} )
export class YANGRestriction {
    @Input() data: any;
    @Input() name: string;
}

@Component( {
    selector: 'yang-node',
    templateUrl: './yang.node.html',
    styleUrls: ['./yang.component.scss']
} )
export class YANGNode implements OnInit, OnChanges {
    @Input() schema: Schema;
    @Input() data: any;
    @Output() refresh = new EventEmitter();
    name: string;

    constructor(public schemasService: SchemasService) {}

    getKeys(object: Object) {
        return Object.keys(object);
    }

    link(key: string, type: string = 'tree', path: string = null) {
        if (path) {
            path = this.schema.path + '/' + path;
        }
        this.linkNode(key, type, path);
    }

    linkNode(key: string, type: string = 'tree', path: string = null) {
        this.schemasService.show(key, type, path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                    this.ngOnInit();
                }
            });
    }

    derivedFrom(id: string) {
        let i = id.indexOf(':');
        let key = id.slice(0,  i) + '.yang';
        let path = '/' + id.slice(i + 1);
        this.schemasService.show(key, 'tree-typedef', path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                    this.ngOnInit();
                }
            });
    }

    onRefresh() {
        this.refresh.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.ngOnInit();
    }

    ngOnInit(): void {
        this.name = Object.keys(this.schema.data)[0]
    }
}

@Component( {
    selector: 'yang-iffeature',
    template: `
        <span class="yang-info-label">if-feature</span>
        <span class="yang-info-value">
            <ng-container *ngFor="let item of iffeatureParse(data)">
                <a *ngIf="item.type == 'link'" (click)="link(item.key, 'tree-feature', item.path)">{{item.content | noPrefix}}</a>
                <span *ngIf="item.type == 'string'">{{item.content}}</span>
            </ng-container>
        </span>`,
    styleUrls: ['./yang.component.scss']
} )
export class YANGIffeature {
    @Input() schema: Schema;
    @Input() data: string;
    @Output() refresh = new EventEmitter();

    constructor(public schemasService: SchemasService) {}

    link(key: string, type: string = 'tree', path: string = null) {
        this.schemasService.show(key, type, path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refresh.emit();
                }
            });
    }

    iffeatureParse(expression: string) {
        let index: number;
        let length = expression.length;
        let result = [];

        for ( index = 0; index < length; index++ ) {
            if ( expression[index].match( "[ ()]" ) ) {
                result.push(new iffItem('string', expression[index]));
                continue;
            } else if ( expression.slice( index, index + 3 ).match( "or " ) ) {
                result.push(new iffItem('string', "or "));
                index += 2;
                continue;
            } else if ( expression.slice( index, index + 4 ).match( "and " ) ) {
                result.push(new iffItem('string', "and "));
                index += 3;
                continue;
            }

            let argstop: number = index;
            while ( expression[argstop] && expression[argstop].match( "[a-zA-Z0-9:@_\\-.]" ) ) {
                argstop++;
            }
            let item = new iffItem('link', expression.slice( index, argstop ));
            let c = item.content.indexOf(':');
            if (c != -1) {
                item.key = item.content.slice(0, c) + '.yang';
            } else {
                item.key = this.schema.key;
            }
            item.path = '/' + item.content.slice(c + 1);

            result.push(item);
            index = argstop - 1;
        }
        return result;
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

    back() {
        this.schemasService.history.pop(); /* the currently displayed element, forget it */
        let prev = this.schemasService.history.pop(); /* the previous one we want to display, it will be stored again by show() */
        this.schemasService.show(prev.key, prev.type, prev.path)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refreshActiveSchema();
                }
            });
    }

    show(key:string, type:string) {
        this.schemasService.show(key, type, null)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.refreshActiveSchema();
                }
            });
    }

    changeView(key: string) {
        this.schemasService.changeActiveSchemaKey(key);
        this.refreshActiveSchema();
        let type = this.activeSchema.type;
        let path = this.activeSchema.path;
        this.schemasService.history.push({key, type, path});
        localStorage.setItem('YEHistory', JSON.stringify(this.schemasService.history));
    }

    schemaData(schema: Schema) {
        return schema.data[Object.keys(schema.data)[0]]
    }

    addSchema() {
        this.router.navigateByUrl( '/netopeer/inventory/schemas' );
    }
}
