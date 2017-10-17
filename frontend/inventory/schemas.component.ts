/*
 * Schemas Inventory
 */
import { Component, Input, OnInit } from '@angular/core';
import { Schema } from './schema';
import { SchemasService } from './schemas.service'

@Component({
  selector : 'inventorySchemas',
  templateUrl : './schemas.component.html',
  styleUrls : ['../netopeer.css', './inventory.component.css'],
  providers: [SchemasService]
})

export class InventorySchemasComponent implements OnInit {
  schemas: Schema[];
  @Input() selectedSchema: Schema;
  addingSchema = false;
  addingResult = -1;
  constructor(private schemasService: SchemasService) { }

  getSchemas(): void {
    this.schemasService.getSchemas().subscribe(schemas => this.schemas = schemas);
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
              result => {this.addingResult = result['success'] ? 1 : 0; this.getSchemas()});
  }

  remove(schema: Schema) {
      this.schemasService.rmSchema(schema).subscribe(
              result => {if (result['success']) { this.getSchemas()}});
  }

  ngOnInit(): void {
    this.getSchemas();
  }

  onSelect(schema: Schema): void {
    this.selectedSchema = schema;
  }
}
