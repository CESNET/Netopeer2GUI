/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Implementation of the search input in device selection for profiles
 */
import { Pipe, PipeTransform } from '@angular/core';
import {Device} from '../netconf-lib/lib/classes/device';

@Pipe({
    name: 'deviceFilter',
    pure: false
})
export class DeviceFilterPipe implements PipeTransform {
    transform(items: {device: Device, inProfile: boolean}[], searchText: string): any {
        if (!items) { return []; }
        if (!searchText) { return items; }
        searchText = searchText.toLowerCase();

        return items.filter( device => {
            return (device.device.name && device.device.name.toLowerCase().includes(searchText)) ||
                device.device.hostname.toLowerCase().includes(searchText) ||
                (device.device.hostname.toLowerCase() + ':' + device.device.port.toString()).includes(searchText) ||
                device.device.username.toLowerCase().includes(searchText);
        });
    }
}
