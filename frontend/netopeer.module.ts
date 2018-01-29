import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AuthGuard } from 'app/utils/auth.guard';

import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatProgressBarModule} from '@angular/material/progress-bar';

import { LoadingComponent } from './common/loading/loading.component';

import { NetopeerComponent } from './netopeer.component';
import { DashboardComponent } from './dashboard.component';
import { InventoryComponent } from './inventory/inventory.component';
import { InventorySchemasComponent } from './inventory/schemas.component';
import { InventoryDevicesComponent } from './inventory/devices.component';
import { ConfigComponent } from './config/config.component';
import { TreeView, TreeIndent, TreeScrollTo, CheckLeafValue } from './config/tree.component';
import { YANGComponent } from './yang/yang.component';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { PluginsComponent } from './plugins/plugins.component';

import { SessionsService } from './config/sessions.service'

const routes: Routes = [
  { path : 'netopeer', component : NetopeerComponent, canActivate : [AuthGuard],
    data : { role : 10, name : 'Netopeer', description : 'Network Management Center', icon : 'fa-gears' },
    children: [{
      path : 'dashboard',
      component : DashboardComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer Dashboard'}
    }, {
      path : 'inventory',
      component : InventoryComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer Items Inventories'},
      children : [{
        path : 'devices',
        component : InventoryDevicesComponent,
        canActivate : [AuthGuard],
        data : { role : 10, name : 'NETCONF Devices Inventory'}
      }, {
        path : 'schemas',
        component : InventorySchemasComponent,
        canActivate : [AuthGuard],
        data : { role : 10, name : 'YANG Schemas Inventory'}
      }]
    }, {
      path : 'config',
      component : ConfigComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer Device Configuration'},
    }, {
      path : 'yang',
      component : YANGComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer YANG Explorer'},
    }, {
      path : 'monitoring',
      component : MonitoringComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer Device Monitoring'},
    }, {
      path : 'plugins',
      component : PluginsComponent,
      canActivate : [AuthGuard],
      data : { role : 10, name : 'Netopeer Plugins'},
    }]
  }
]

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    NgbModule.forRoot(),
    RouterModule.forChild(routes),
    MatProgressSpinnerModule,
    MatProgressBarModule,
  ],
  declarations: [
    NetopeerComponent,
    DashboardComponent,
    InventoryComponent,
    InventorySchemasComponent,
    InventoryDevicesComponent,
    ConfigComponent,
    LoadingComponent,
    CheckLeafValue,
    TreeScrollTo,
    TreeIndent,
    TreeView,
    YANGComponent,
    MonitoringComponent,
    PluginsComponent
  ],
  providers: [
    SessionsService
  ],
  entryComponents : [
    NetopeerComponent
  ]
})
export class NetopeerModule { }
