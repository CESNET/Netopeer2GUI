/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A universal container for popups
 */

import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'lib-nc-popup',
  template: `
    <div class="popup-wrapper">
      <div class="popup-content">
        <div *ngIf="title !== ''" class="popup-header">{{title}}</div>
        <ng-content></ng-content>
        <div class="popup-toolbox" *ngIf="toolbox">
          <button class="btn btn-danger" (click)="cancel()">{{cancelBtnText}}</button>
          <button class="btn btn-primary float-right" (click)="submit()">{{submitBtnText}}</button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./popup.component.scss']
})
export class PopupComponent implements OnInit {

  @Input() title = '';
  @Input() toolbox = true;
  @Input() submitBtnText = 'Submit';
  @Input() cancelBtnText = 'Cancel';

  @Output() canceled: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() submitted: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() {
  }

  ngOnInit() {
  }

  cancel() {
    this.canceled.emit(true);
  }

  submit() {
    this.submitted.emit(true);
  }

}
