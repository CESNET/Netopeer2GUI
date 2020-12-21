/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Container for the profiles tab
 */

import {Component, OnInit} from '@angular/core';
import {ProfileService} from "../../services/profile.service";
import {ProfileDevice} from "../../classes/ProfileDevice";


@Component({
    selector: 'nc-profiles',
    templateUrl: './profiles.component.html',
    styleUrls: ['./profiles.component.scss']
})
export class ProfilesComponent implements OnInit {

    constructor(
        private profileService: ProfileService
    ) {
    }

    profiles: string[] = [];
    selectedProfile: string;
    activeProfile: string;
    devices: ProfileDevice[] = [];
    connectOnLogin = false;
    loading = false;
    activationLoading = false;
    connectOnLoginChangeLoading = false;

    error = '';

    addNewProfileShown = false;
    connectProfileShown = false;

    ngOnInit() {
        this.loading = true;
        this.profileService.getAllProfileNames().subscribe(
            profiles => {
                this.profiles = profiles;
            },
            err => {
                this.error = err.message;
            }
        );
        this.profileService.getOnLoginProfile().subscribe(
            data => {
                this.selectedProfile = data.name;
                this.devices = data.devices;
                this.loading = false;
                this.activeProfile = data.name;
                this.connectOnLogin = data.connectOnLogin;
            }
        );
    }

    reloadDevices() {
        this.loading = true;
        this.profileService.getProfileDevices(this.selectedProfile).subscribe(
            data => {
                this.devices = data;
                this.loading = false;
            }
        );
    }

    setActiveProfile(profileName: string) {
        this.activationLoading = true;
        this.profileService.setActiveProfile(profileName).subscribe(
            _ => {
                this.activeProfile = profileName;
                this.activationLoading = false;
            },
            err => {
                console.error(err.message);
                this.error = err.message;
                this.activationLoading = false;
            }
        );
    }

    removeProfile() {
        this.profileService.removeProfile(this.selectedProfile).subscribe(
            _ => {
                this.profiles = this.profiles.filter(p => p !== this.selectedProfile);
                if(this.profiles.length !== 0) {
                    this.selectedProfile = this.profiles[0];
                    this.reloadDevices();
                }
            },
            err => {

            }
        );
    }

    addProfile(profileName: string) {
        this.profiles.push(profileName);
        this.addNewProfileShown = false;
        this.selectProfile(profileName);
    }


    selectProfile(profileName: string) {
        this.selectedProfile = profileName;
        this.reloadDevices();
    }

    setShouldConnectOnLogin(value) {
        this.connectOnLoginChangeLoading = true;
        this.profileService.setProfileConnectOnLogin(this.selectedProfile, value.target.checked).subscribe(

            response => {
                if(!response.success) {
                    this.error = "Server error!"
                }
                this.connectOnLoginChangeLoading = false;
            },
            err => {
                this.error = "HTTP error";
                if(err.message) {
                    this.error += ": " + err.message
                }
                this.connectOnLoginChangeLoading = false;
            }
        )
    }

    showConnectProfileDialog() {
      this.connectProfileShown = true;
    }



}
