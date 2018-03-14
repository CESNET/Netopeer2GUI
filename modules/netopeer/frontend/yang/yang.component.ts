import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SchemasService } from './schemas.service';
import { Schema } from '../inventory/schema';

@Component( {
    selector: 'netopeer-yang',
    templateUrl: './yang.component.html',
    styleUrls: ['./yang.component.scss']
} )

export class YANGComponent {
    title = 'YANG Explorer';
    test = null;

    constructor( private schemasService: SchemasService,
        private router: Router ) { }

    addSchema() {
        this.router.navigateByUrl( '/netopeer/inventory/schemas' );
    }
}
