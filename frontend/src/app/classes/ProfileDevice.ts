/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Structure to display a device in the profiles tab
 */
export class ProfileDevice {
    id: string;
    name?: string;
    hostname: string;
    port: number;
    username: string;
    password?: string;
    subscriptions?: string[];
    fingerprint?: string;
}
