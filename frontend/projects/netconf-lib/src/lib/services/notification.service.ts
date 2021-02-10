/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Service for loading and displaying notifications
 */
import {EventEmitter, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Notification} from '../classes/Notification';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor() {
    }

    public onNewNotification: EventEmitter<Notification> = new EventEmitter<Notification>();

    currentId = 0;

    public static getCurrentTime(): string {
        const now = new Date();
        return ('0' + now.getHours()).slice(-2) + ':' +
            ('0' + now.getMinutes()).slice(-2) + ':' +
            ('0' + now.getSeconds()).slice(-2);
    }

    public createNotification(title: string, deviceName: string, channel: string): Notification {
        return {
            id: this.getNextAvailableId(),
            title,
            time: NotificationService.getCurrentTime(),
            deviceName,
            channel
        };
    }


    public sendNotification(notification: Notification) {
        this.onNewNotification.emit(notification);
    }

    public getNextAvailableId(): number {
        this.currentId++;
        return this.currentId;
    }
}
