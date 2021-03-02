import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {NodeControlService} from '../../../services/node-control.service';

@Component({
  selector: 'nct-yang-node-editable-value',
  templateUrl: './yang-node-editable-value.component.html',
  styleUrls: ['./yang-node-editable-value.component.scss']
})
export class YangNodeEditableValueComponent implements OnInit {

  @Input() editable: boolean;
  @Input() value: any;
  @Input() datatype?: string;


  @Output() changeSaved = new EventEmitter<any>();
  @Output() changeDiscarded = new EventEmitter<any>();

  editing = false;
  originalValue: any;
  editingValue: any;

  constructor(public nodeControlService: NodeControlService) {
  }

  ngOnInit() {
    this.originalValue = this.value;
    this.editingValue = this.value;
    this.nodeControlService.performNodeAction.subscribe(
      action => {
        if (action === 'discardChanges') {
          this.value = this.originalValue;
          this.editingValue = this.originalValue;
          this.changeDiscarded.emit(this.originalValue);
        } else if (action === 'confirmNewValue') {
          this.originalValue = this.value;
        }
      }
    );
  }

  confirmEdit() {
    this.editing = false;
    this.changeSaved.emit(this.editingValue);
  }

}
