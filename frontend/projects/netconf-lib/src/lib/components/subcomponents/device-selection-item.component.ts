/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A single device box for the device selection component
 */

import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {Device} from '../../classes/device';


@Component({
  selector: 'lib-device-selection-item',
  templateUrl: './device-selection-item.component.html',
  styleUrls: ['../device-selection.component.scss']
})
export class DeviceSelectionItemComponent implements OnInit {

  @Input() device: Device;
  @Input() selected: boolean;
  @Output() selectedChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  compatibleDevices: Device[] = [];

  constructor() {
  }

  ngOnInit() {
  }

  changeSelection() {
    this.selectedChange.emit(!this.selected);
  }

}
