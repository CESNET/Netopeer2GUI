/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A structure for devices when connecting them
 */
import {Device} from "./device";
import {ConnectionStatus} from "./ConnectionStatus";

export class DeviceWithStatus {
  device: Device;
  status: ConnectionStatus | string;
  hostcheckMessageId?: string;
  hostcheckMessage?: string;
}
