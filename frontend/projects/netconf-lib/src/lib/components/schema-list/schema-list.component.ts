/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A list of upladed schemas with links to the YANG Explorer tool
 */
import {Component, Input, OnInit} from '@angular/core';
import {SchemasService} from '../../services/schemas.service';

@Component({
  selector: 'lib-schema-list',
  templateUrl: './schema-list.component.html',
  styleUrls: ['./schema-list.component.scss']
})
export class SchemaListComponent implements OnInit {

  constructor(public schemasService: SchemasService) { }

  @Input() selected = '';

  loading = false;
  error = '';
  schemas: string[] = [];

  ngOnInit() {
    this.loading = true;
    this.schemasService.getSchemaNames().subscribe(
    names => {
      this.schemas = names;
      this.loading = false;
    },
    err => {
        this.error = err.message;
        this.loading = false;
      });
  }

  removeSchema(name: string) {
    if (confirm('Do you really want to remove ' + name + '?')) {
      this.loading = true;
      this.schemasService.removeSchema(name).subscribe(
        res => {
          const idx = this.schemas.indexOf(name);
          this.schemas.splice(idx, 1);
          if (!res.success) {
            this.error = res.message;
          }
          this.loading = false;
        },
        err => {
          this.error = err.message;
          this.loading = false;
        }
      );
    }

  }

}
