/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Content of a single notification
 */
import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {NotificationService, Notification} from '../../../netconf-lib';
import {trigger, state, style, animate, transition} from '@angular/animations';

@Component({
    selector: 'nc-notification-info',
    templateUrl: './notification-info.component.html',
    styleUrls: ['./notification-info.component.scss'],
    animations: [
        trigger('changeDivSize', [
            state('initial', style({
                backgroundColor: 'green',
                width: '100%',
            })),
            state('final', style({
                backgroundColor: 'red',
                width: '0',
            })),
            transition('initial=>final', animate('10s')),
        ]),
    ]
})
export class NotificationInfoComponent implements OnInit {

    constructor(
        private notificationService: NotificationService
    ) {
    }
    @Input() currentState: string;
    @Input() notification: Notification;

    @Output() timedRemove: EventEmitter<number> = new EventEmitter<number>();
    @Output() forceRemove: EventEmitter<number> = new EventEmitter<number>();




    ngOnInit() {
    }

    removeSelf() {
        this.timedRemove.emit(this.notification.id);
    }

    forceRemoveSelf() {
        this.forceRemove.emit(this.notification.id);
    }
}
