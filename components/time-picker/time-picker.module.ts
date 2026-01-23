/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DateHelperByDateFns, DateHelperByDatePipe } from './date-helper.service';

import { NzTimePickerPanelComponent } from './time-picker-panel.component';
import { NzTimePickerComponent } from './time-picker.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FormsModule,
    NzTimePickerComponent,
    NzTimePickerPanelComponent
  ],
  providers: [DateHelperByDateFns, DateHelperByDatePipe]
})
export class NzTimePickerModule {}
