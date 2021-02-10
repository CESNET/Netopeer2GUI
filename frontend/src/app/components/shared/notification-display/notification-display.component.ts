/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Container for notifications in the bottom-right corner of the screen
 */
import {Component, OnInit} from '@angular/core';
import {NotificationService} from '../../../netconf-lib';
import {Notification} from '../../../netconf-lib';

@Component({
    selector: 'nc-notification-display',
    templateUrl: './notification-display.component.html',
    styleUrls: ['./notification-display.component.scss']
})
export class NotificationDisplayComponent implements OnInit {

    constructor(
        private notificationService: NotificationService
    ) {
    }

    displayedNotifications: { notification: Notification, state: string }[] = [];
    toRemove: number[] = [];

    ngOnInit() {
        this.notificationService.onNewNotification.subscribe(
            notification => {
                this.addNotification(notification);
            }
        );
    }


    addNotification(notification: Notification) {
        this.displayedNotifications.push({notification, state: 'initial'});
        if (this.displayedNotifications.length > 3) {
            for (let i = 0; i < this.displayedNotifications.length - 3; i++) {
                this.toRemove.push(this.displayedNotifications[i].notification.id);
                this.displayedNotifications[i].state = 'final';
            }

        }
    }

    clearClicked() {
        this.displayedNotifications = [];
    }

    removeNotification(notificationId: number) {
        if (this.toRemove.indexOf(notificationId) > -1) {
            this.displayedNotifications = this.displayedNotifications.filter(
                notification => notification.notification.id !== notificationId);
        }
    }

    forceRemoveNotification(notificationId: number) {
        this.displayedNotifications = this.displayedNotifications.filter(
            notification => notification.notification.id !== notificationId);
    }

    cleanupNotifications() {

    }
}


