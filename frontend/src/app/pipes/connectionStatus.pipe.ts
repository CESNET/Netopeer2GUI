/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Translating a connection status number to human readable status text
 */
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'connectionStatus',
    pure: false
})
export class ConnectionStatusPipe implements PipeTransform{
    transform(status: number | string): string {
        switch (status) {
            case -2:
                return 'Waiting for connection';
            case -1:
                return 'Connecting';
            case 0:
                return 'Waiting for the device';
            case 1:
                return "Connected";
            case 2:
                return "HTTP error";
            case 3:
                return "Password required";
            case 4:
                return "Hostkey changed!";
            case 5:
                return "Missing schema!";
            case 6:
                return "Server error";
            default:
                if(typeof status == 'number')
                    return status.toString();
                else return status;
        }
    }
}
