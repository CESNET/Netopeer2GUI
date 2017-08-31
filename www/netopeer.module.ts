import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AuthGuard } from 'app/utils/auth.guard';

import { NetopeerComponent } from './netopeer.component';
import { DashboardComponent } from './dashboard.component';
import { InventoryComponent } from './inventory/inventory.component';
import { InventorySchemasComponent } from './inventory/schemas.component';
import { InventoryDevicesComponent } from './inventory/devices.component';
import { ConfigComponent } from './config/config.component';
import { YANGComponent } from './yang/yang.component';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { PluginsComponent } from './plugins/plugins.component';


const routes: Routes = [
  { path : 'netopeer', component : NetopeerComponent, canActivate : [AuthGuard],
    data : { role : 10, name : 'Netopeer', description : 'Network Management Center', icon : 'fa-user-secret' },
    children: [
      {  path : 'dashboard', component : DashboardComponent, canActivate : [AuthGuard] },
      {  path : 'inventory', component : InventoryComponent, canActivate : [AuthGuard],
         children : [
           { path : 'devices', component : InventoryDevicesComponent, canActivate : [AuthGuard] },
           { path : 'schemas', component : InventorySchemasComponent, canActivate : [AuthGuard] }
         ]
      },
      { path : 'config', component : ConfigComponent, canActivate : [AuthGuard] },
      { path : 'yang', component : YANGComponent, canActivate : [AuthGuard] },
      { path : 'monitoring', component : MonitoringComponent, canActivate : [AuthGuard] },
      { path : 'plugins', component : PluginsComponent, canActivate : [AuthGuard] }
    ]
  }
]

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot(),
    RouterModule.forChild(routes)
  ],
  declarations: [
    NetopeerComponent,
    DashboardComponent,
    InventoryComponent,
    InventorySchemasComponent,
    InventoryDevicesComponent,
    ConfigComponent,
    YANGComponent,
    MonitoringComponent,
    PluginsComponent
  ],
  entryComponents : [
    NetopeerComponent
  ]
})
export class NetopeerModule { }
