/*
 * Schemas Inventory
 */
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Schema } from './schema';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import {DialogueSchema} from './inventory.component';

import { SchemasService } from '../yang/schemas.service'
import {SocketService} from 'app/services/socket.service';

@Component( {
    selector: 'inventorySchemas',
    templateUrl: './schemas.component.html',
    styleUrls: ['./inventory.component.scss']
} )

export class InventorySchemasComponent implements OnInit {
    schemas;
    addingSchema = false;
    addingResult = -1;
    constructor(private schemasService: SchemasService,
                private socketService: SocketService,
                private modalService: NgbModal,
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

    socketAnswer(event: string, id:string, item: string, value: any, item2: string, value2: any) {
        let data = {'id': id};
        data[item] = value;
        data[item2] = value2
        this.socketService.send(event, data);
    }

    upload(schema: File) {
        if (!schema) {
            /* do nothing */
            return;
        }

        this.socketService.subscribe('getschema').subscribe((message: any) => {
            let modalRef = this.modalService.open(DialogueSchema, {centered: true, backdrop: 'static', keyboard: false});
            modalRef.componentInstance.info = message;
            modalRef.result.then((result) => {
                this.socketAnswer('getschema_result', message['id'], 'filename', result['filename'], 'data', result['data']);
            }, (reason) => {
                this.socketAnswer('getschema_result', message['id'], 'filename', '', 'data', '');
            });
        });

        /* upload the schema file to the server, if success the schema list is refreshed */
        this.schemasService.addSchema(schema).subscribe(result => {
                this.socketService.unsubscribe('getschema');
                this.addingResult = result['success'] ? 1 : 0;
                this.getSchemas();
        });
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
