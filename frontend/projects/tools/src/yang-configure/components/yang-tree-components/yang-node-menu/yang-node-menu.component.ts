import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'nct-yang-node-menu',
  templateUrl: './yang-node-menu.component.html',
  styleUrls: ['./yang-node-menu.component.scss']
})
export class YangNodeMenuComponent implements OnInit {

  @Input() nodeType: number;
  @Input() isKey: boolean;

  @Output() addChildClicked: EventEmitter<boolean>;
  @Output() addSiblingClicked: EventEmitter<boolean>;
  @Output() removeClicked: EventEmitter<boolean>;

  constructor() { }

  ngOnInit() {
  }

}
