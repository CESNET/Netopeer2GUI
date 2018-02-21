import { Component } from '@angular/core';
import {Router} from '@angular/router';

import {SchemasService} from './schemas.service';
import {Schema} from '../inventory/schema';

@Component({
  selector : 'netopeer-yang',
  templateUrl : './yang.component.html',
  styleUrls : ['./yang.component.scss']
})

export class YANGComponent {
  title = 'YANG Explorer';

  constructor(private schemasService: SchemasService,
              private router: Router) {}


  addSchema() {
      this.router.navigateByUrl('/netopeer/inventory/schemas');
  }

  close(key: string) {
      let index = Object.keys(this.schemasService.schemas).indexOf(key);
      if (this.schemasService.activeSchema == key) {
          if (index > 0) {
              this.schemasService.changeActiveSchemaKey(Object.keys(this.schemasService.schemas)[index - 1])
          } else if (Object.keys(this.schemasService.schemas).length > 1) {
              this.schemasService.changeActiveSchemaKey(Object.keys(this.schemasService.schemas)[1])
          } else {
              this.schemasService.activeSchema = null;
          }
      }
      delete this.schemasService.schemas[key];
      this.schemasService.storeData();
  }
}
