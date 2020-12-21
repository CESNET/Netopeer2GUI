/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Displays a list of saved devices that can be added to a profile
 */

import {Component, OnInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {Router} from '@angular/router';
import {ProfileService} from '../../services/profile.service';
import {DeviceService} from '../../netconf-lib';
import {ProfileDevice} from '../../classes/ProfileDevice';
import {Device} from '../../netconf-lib/lib/classes/device';




@Component({
    selector: 'nc-profile-edit',
    templateUrl: './profile-edit.component.html',
    styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private profileService: ProfileService,
        private deviceService: DeviceService,
        private router: Router
    ) {
    }

    selectedProfile: string;
    allDevices: Device[];
    savedDevices: {device: ProfileDevice, inProfile: boolean, subscriptions?: string[]}[] = [];
    searchedText = '';

    paginationOptions = {page: 1, perPage: 9};

    loading = false;
    error = '';
    saving = false;
    saveError = '';

    ngOnInit() {
        this.loading = true;
        this.initDevices();
    }

    initDevices() {
        this.deviceService.getSavedDevices().subscribe(
            devices => {
                this.allDevices = devices;
                this.route.paramMap.subscribe(
                    params => {
                        this.selectedProfile = params.get('profile');
                        if (this.selectedProfile) {
                            this.loadProfile();
                        }
                    });
            },
            err => {
                this.error = err.message;
                this.loading = false;
            }
        );
    }

    loadProfile() {
        this.loading = true;
        if (!this.allDevices) {
            this.initDevices();
            return;
        }
        this.profileService.getProfileDevices(this.selectedProfile).subscribe(
            profileDevices => {
                for (const device of this.allDevices) {
                    let inProfile = false;
                    let subscriptions = [];
                    for (const profileDevice of profileDevices) {
                        if (profileDevice.id === device.id) {
                            inProfile = true;
                            subscriptions = profileDevice.subscriptions;
                            break;
                        }
                    }
                    this.savedDevices.push({device, inProfile, subscriptions});
                }
                this.loading = false;
            },
            err => {
                this.error = err.message;
                this.loading = false;
            }
        );
    }

    nextPage() {
        if ((this.paginationOptions.page * this.paginationOptions.perPage) < this.savedDevices.length) {
            this.paginationOptions.page++;
        }

    }

    prevPage() {
        if (this.paginationOptions.page > 1) {
            this.paginationOptions.page--;
        }
    }

    setPage(page: number) {
        this.paginationOptions.page = page;
    }

    removeSubscription(device: ProfileDevice, channel: string) {

    }

    saveChanges() {
        const ids = [];
        for (const device of this.savedDevices) {
            if (device.inProfile) {
                ids.push({id: device.device.id});
            }
        }
        console.log(ids);
        this.saving = true;
        this.saveError = '';
        this.profileService.saveProfile(this.selectedProfile, ids).subscribe(
            success => {
                this.saving = false;
                if (success.success) {
                    this.router.navigateByUrl('/netconf/profiles');
                } else {
                    this.saveError = 'Server could not write data to profile ' + this.selectedProfile + '.';
                }
            },
            err => {
                this.saving = false;
                this.saveError = err.message;
            }
        );
    }


}
