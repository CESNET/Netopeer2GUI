import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'nct-yang-schema-link',
  templateUrl: './yang-schema-link.component.html',
  styleUrls: ['./yang-schema-link.component.scss']
})
export class YangSchemaLinkComponent implements OnInit {

  @Input() module: string;

  constructor() { }

  ngOnInit() {
  }

}
