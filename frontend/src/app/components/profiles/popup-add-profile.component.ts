/*
* Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
* Popup shown to the user when clicking on the "add profile" button
*/


import {Component, OnInit, Output, EventEmitter, Input} from '@angular/core';
import {ProfileService} from "../../services/profile.service";


@Component({
    selector: 'nc-add-profile',
    templateUrl: './popup-add-profile.component.html',
    styleUrls: ['./profiles.component.scss']
})
export class PopupAddProfileComponent implements OnInit {

    @Output() saved: EventEmitter<string> = new EventEmitter<string>();
    @Output() canceled: EventEmitter<boolean> = new EventEmitter<boolean>();

    loading = false;

    inputVal = '';
    error = '';

    constructor(private profileService: ProfileService) {
    }

    ngOnInit() {
    }

    saveProfile() {
        if(this.inputVal) {
            this.loading = true;
            this.profileService.addProfile(this.inputVal).subscribe(
                _ => {
                    this.saved.emit(this.inputVal);
                    this.loading = false;
                    this.inputVal = '';
                },
                err => {
                    this.error = err.message;
                    this.loading = false;
                }
            );
        }
        else {
            this.error = 'Name can not be empty';
        }

    }

}
