/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Loads and renders a schema based on the 'schema' path parameter
 */
import {Component, OnInit} from '@angular/core';
// @ts-ignore
import {SchemasService} from 'netconf-lib';
import {ActivatedRoute} from '@angular/router';


@Component({
  selector: 'nct-yang-explorer',
  templateUrl: './yang-explorer.component.html',
  styleUrls: ['./yang-explorer.component.scss']
})
export class YangExplorerComponent implements OnInit {
  constructor(public schemasService: SchemasService, private route: ActivatedRoute) {
  }

  schemaName = '';
  schema: any = '';
  loading = true;
  error: string;

  ngOnInit(): void {
    this.route.paramMap.subscribe(
      params => {
        this.loading = true;
        this.schemaName = params.get('schema');
        this.schemasService.getSchema(this.schemaName).subscribe(
          schema => {
            this.schema = this.sanitizeYang(schema);
            this.loading = false;
          },
          err => {
            this.loading = false;
            this.error = err.message;
          }
        );
      });
  }

  sanitizeYang(yang: string) {
    return SchemasService.formatYang(SchemasService.newlineToBr(yang));
  }

}
