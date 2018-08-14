/*
 * Schemas Inventory
 */
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Schema } from './schema';
import { SchemasService } from '../yang/schemas.service'

@Component( {
    selector: 'inventorySchemas',
    templateUrl: './schemas.component.html',
    styleUrls: ['./inventory.component.scss']
} )

export class InventorySchemasComponent implements OnInit {
    schemas;
    addingSchema = false;
    addingResult = -1;
    constructor( private schemasService: SchemasService,
        private router: Router ) {
        this.schemas = [];
    }

    getSchemas(): void {
        this.schemasService.getSchemas().subscribe( result => {this.schemas = result;});
    }

    showAddSchema() {
        this.addingSchema = !this.addingSchema;
        this.addingResult = -1;
    }

    upload(schema: File) {
        if (!schema) {
            /* do nothing */
            return;
        }

        /* upload the schema file to the server, if success the schema list is refreshed */
        this.schemasService.addSchema(schema).subscribe(
            result => { this.addingResult = result['success'] ? 1 : 0; this.getSchemas() } );
    }

    remove(key: string) {
        this.schemasService.rmSchema(key).subscribe(
            result => { if ( result['success'] ) { this.getSchemas() } } );
    }

    ngOnInit(): void {
        this.getSchemas();
    }

    onSelect(key: string): void {
        this.schemasService.show(key)
            .subscribe((result: object) => {
                if (result['success']) {
                    this.router.navigateByUrl( '/netopeer/yang' );
                }
            });
    }
}
