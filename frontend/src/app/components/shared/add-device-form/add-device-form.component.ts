/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A form for connecting to new devices and adding them to the database
 */

import { Component, OnInit } from '@angular/core';
import {DeviceService} from '../../../netconf-lib';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'nc-add-device',
  templateUrl: './add-device-form.component.html',
  styleUrls: ['./add-device-form.component.scss']
})
export class AddDeviceFormComponent implements OnInit {

  deviceForm = new FormGroup({
    deviceName: new FormControl(''),
    hostname: new FormControl('localhost'),
    port: new FormControl(''),
    username: new FormControl('admin'),
    password: new FormControl(''),
    connectToDevice: new FormControl(true),
    saveDevice: new FormControl(true),
    addToActiveProfile: new FormControl(false)
  });
  error = '';

  constructor(private deviceService: DeviceService) { }

  ngOnInit() {
  }

  onSubmit() {
    if (this.deviceForm.value.connectToDevice) {
      this.deviceService.createConnectionRequest([
        {
          id: '',
          port: this.deviceForm.value.port,
          username: this.deviceForm.value.username,
          name: this.deviceForm.value.deviceName,
          hostname: this.deviceForm.value.hostname,
          password: this.deviceForm.value.password
        }
      ]);
    }
    if (this.deviceForm.value.saveDevice) {
      this.deviceService.saveDevice(this.deviceForm.value.hostname,
          this.deviceForm.value.port,
          this.deviceForm.value.username,
          this.deviceForm.value.deviceName,
          this.deviceForm.value.password
      ).subscribe(
          id => {
            this.deviceForm.reset();
          },
          err => {
            this.error = err.message;
          }
      );
    }
  }
}
