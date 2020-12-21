/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Universal content container with a header
 */
import {Component, OnInit, Input} from '@angular/core';

@Component({
  selector: 'lib-content-box',
  template: `
    <div class="content-box">
      <div class="box-header" *ngIf="title">{{title}}</div>
      <div class="box-content" [class.box-content-limited]="limitWidth">
          <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./content-box.component.scss']
})
export class ContentBoxComponent implements OnInit {

  @Input() title = '';
  @Input() limitWidth = false;

  constructor() {
  }

  ngOnInit() {

  }

}
