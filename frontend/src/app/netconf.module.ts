import { APP_INITIALIZER, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
// @ts-ignore
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
// @ts-ignore
import { AuthGuard } from 'app/utils/auth.guard';
// @ts-ignore
import { SafePipe, SafePipeModule } from 'app/utils/safe.pipe';



import { NetconfComponent } from './components/netconf.component';
import {DevicesComponent} from './components/devices/devices.component';
import {ToolsComponent} from './components/tools/tools.component';
import {NotificationsComponent} from './components/notifications/notifications.component';
import {ProfilesComponent} from './components/profiles/profiles.component';
import {AddDeviceFormComponent} from './components/shared/add-device-form/add-device-form.component';
import {DeviceListComponent} from './components/devices/device-list/device-list.component';
import {NotificationDisplayComponent} from './components/shared/notification-display/notification-display.component';
import {NotificationInfoComponent} from './components/shared/notification-info/notification-info.component';
import {ToolLoaderService} from './services/tool-loader/tool-loader.service';
import {ClientToolLoaderService} from './services/tool-loader/client-tool-loader.service';
import {ToolConfigProvider} from './services/tool-config.provider';
import {PopupAddProfileComponent} from './components/profiles/popup-add-profile.component';
import {ProfileEditComponent} from './components/profiles/profile-edit.component';
import {DeviceFilterPipe} from './pipes/device-filter.pipe';
import {PaginationPipe} from './pipes/pagination.pipe';
import {PaginationComponent} from './components/shared/pagination/pagination.component';
import {ConnectionStatusPipe} from './pipes/connectionStatus.pipe';


import {NetconfLibModule} from './netconf-lib';
import {PopupConnectProfileComponent} from "./components/profiles/popup-connect-profile.component";


const routes: Routes = [{
    path: 'netconf',
    component: NetconfComponent,
    canActivate: [AuthGuard],
        data: {
            role: 10,
            name: 'NETCONF',
            description: 'Configure your network devices using the NETCONF protocol',
            icon: 'fa-server'
    },
    children: [
        {
            path: '',
            redirectTo: 'devices',
            pathMatch: 'full'
        },
        {
            path: 'devices',
            component: DevicesComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        },
        {
          path: 'tool/:tool',
          component: ToolsComponent,
          canActivate: [AuthGuard],
          data: {
            role: 10
          }
        },
        {
            path: 'tool/:tool',
            component: ToolsComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        },
        {
            path: 'tools',
            component: ToolsComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        },
        {
            path: 'profile/:profile',
            component: ProfileEditComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        },
        {
            path: 'profiles',
            component: ProfilesComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        },
        {
            path: 'notifications',
            component: NotificationsComponent,
            canActivate: [AuthGuard],
            data: {
                role: 10
            }
        }
    ]
}];


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
        SafePipeModule,
        RouterModule.forChild(routes),
        NgbModule,
        BrowserAnimationsModule,
        NetconfLibModule,
        ReactiveFormsModule
    ],
    declarations: [
        NetconfComponent,
        DevicesComponent,
        ToolsComponent,
        NotificationsComponent,
        ProfilesComponent,
        AddDeviceFormComponent,
        DeviceListComponent,
        NotificationDisplayComponent,
        NotificationInfoComponent,
        PopupAddProfileComponent,
        ProfileEditComponent,
        DeviceFilterPipe,
        PaginationPipe,
        ConnectionStatusPipe,
        PaginationComponent,
        PopupConnectProfileComponent
    ],
    providers: [
        SafePipe,
        { provide: ToolLoaderService, useClass: ClientToolLoaderService },
        ToolConfigProvider,
        {
            provide: APP_INITIALIZER,
            useFactory: (provider: ToolConfigProvider) => () =>
                provider
                    .loadConfig()
                    .toPromise()
                    .then(config => (provider.config = config)),
            multi: true,
            deps: [ToolConfigProvider]
        }
    ]
})
export class NetconfModule {}
