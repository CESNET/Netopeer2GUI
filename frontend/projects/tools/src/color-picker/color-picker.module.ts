/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Example tool module
 * Copy this to a new folder and rename to your tool to start developing a new tool
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorPickerComponent } from './components/color-picker.component';
// @ts-ignore
import {NetconfLibModule} from 'netconf-lib';
import {HttpClientModule} from '@angular/common/http';


@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    NetconfLibModule
  ],
  declarations: [ColorPickerComponent],
  entryComponents: [ColorPickerComponent]
})
export class ColorPickerModule {
  static entry = ColorPickerComponent;
}
