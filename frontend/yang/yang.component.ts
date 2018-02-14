import { Component, OnInit } from '@angular/core';
import {Router} from '@angular/router';

import {SchemasService} from './schemas.service';
import {Schema} from '../inventory/schema';

@Component({
  selector : 'netopeer-yang',
  templateUrl : './yang.component.html',
  styleUrls : ['./yang.component.scss']
})

export class YANGComponent implements OnInit {
  title = 'YANG Explorer';
  activeSchema: Schema;

  constructor(private schemasService: SchemasService,
              private router: Router) {}


  addSchema() {
      this.router.navigateByUrl('/netopeer/inventory/schemas');
  }

  changeActiveSchema(key: string) {
      this.activeSchema = this.schemasService.changeActiveSchema(key);
  }

  close(key: string) {
      for (let i in this.schemasService.schemas) {
          if (this.schemasService.schemas[i].key == key) {
              this.schemasService.schemas.splice(Number(i), 1);
              if (this.schemasService.activeSchema == key) {
                  if (Number(i) > 0) {
                      this.changeActiveSchema(this.schemasService.schemas[Number(i) - 1].key)
                  } else if (this.schemasService.schemas.length) {
                      this.changeActiveSchema(this.schemasService.schemas[0].key)
                  }
              }
              this.schemasService.storeData();
              break;
          }
      }
      this.activeSchema = this.schemasService.getActiveSchema();
  }

  ngOnInit(): void {
      this.activeSchema = this.schemasService.getActiveSchema();
  }
}
