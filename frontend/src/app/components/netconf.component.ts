/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Container for the whole module
 */

import {Component, OnInit} from '@angular/core';
import {ConfigService} from "../services/config.service";
import {ProfileService} from "../services/profile.service";
import {NotificationService} from "../services/notification.service";
import {DeviceService, SessionService} from "../netconf-lib";
import {DeviceWithStatus} from "../netconf-lib";

@Component({
  selector: 'nc-base',
  templateUrl: './netconf.component.html',
  styleUrls: ['./netconf.component.scss']
})
export class NetconfComponent implements OnInit {

  constructor(
    private configService: ConfigService,
    private profileService: ProfileService,
    private notificationService: NotificationService,
    public deviceService: DeviceService,
    public sessionService: SessionService
  ) {
  }

  statusMessage: string = "Loading...";
  config: object = {};

  ngOnInit() {
    this.statusMessage = "Loading config...";
    this.configService.getConfig().subscribe(
      config => {
        this.config = config;
        this.statusMessage = "Checking open sessions...";
        this.sessionService.loadOpenSessions().subscribe(
          sessions => {
            if (sessions.length > 0) {
                if(confirm('Found active device sessions. Load them? (Answering "cancel" will discard these sessions)')) {
                  this.sessionService.sessions = sessions;
                }
                else {
                  this.sessionService.destroyAllSessions().subscribe();
                  this.loadProfile();
                }
            } else {
              this.loadProfile();
            }
          }
        );
        this.loadProfile();
      },
      err => {
        this.statusMessage = "";
      }
    );
  }

  loadProfile() {
    this.statusMessage = "Loading profile...";
    this.profileService.getOnLoginProfile().subscribe(
      data => {
        this.statusMessage = "";
        if (data.connectOnLogin) {
          this.deviceService.createConnectionRequest(data.devices);
        }
      },
      err => {
        this.statusMessage = "";
      }
    );


    /*setTimeout(() => {
        this.notificationService.sendNotification(
            this.notificationService.createNotification("Notification 1", "Internal", "Channel 1")
        );
    }, 250);
    setTimeout(() => {
        this.notificationService.sendNotification(
            this.notificationService.createNotification("Notification 2", "Internal", "Channel 1")
        );
    }, 1500);
    setTimeout(() => {
        this.notificationService.sendNotification(
            this.notificationService.createNotification("Notification 3", "Internal", "Channel 1")
        );
    }, 3000);
    setTimeout(() => {
        this.notificationService.sendNotification(
            this.notificationService.createNotification("Notification 4", "Internal", "Channel 1")
        );
    }, 5000);*/

  }

}
