import {Component, Input, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {SchemasService} from 'netconf-lib';

@Component({
  selector: 'nct-yang-new-node',
  templateUrl: './yang-new-node.component.html',
  styleUrls: ['./yang-new-node.component.scss']
})
export class YangNewNodeComponent implements OnInit {
  /*
  * Move child generation to the session service
  * Mark them with node['new']
  * This component will only be the dropdown menu, node will be handleded by the schema-node component
  */
  @Input() sessionKey: string;
  @Input() schema: string;
  @Input() path: string;

  names = [];
  children = [];  // If the new node has mandatory children, generate them.
  loading = true;
  error = '';

  constructor(
    public schemaService: SchemasService
  ) { }

  ngOnInit() {
    this.loadNodeInfo();
  }

  loadNodeInfo() {
    this.schemaService.getParsedSchema(this.schema, this.sessionKey, this.path).subscribe(schema => {
      this.loading = false;
      const schemaName = Object.keys(schema)[0];
      console.log(schema);
      if (schema[schemaName]['data']) {
        this.names = Object.keys(schema[schemaName]['data']);
      } else {
        this.error = 'This node has no children.'; // TODO: component should delete self after some time
      }
    });
  }

  nodeSelected(value: string) {
    // load children OR add a value edit (if node is leaf)

  }


}
