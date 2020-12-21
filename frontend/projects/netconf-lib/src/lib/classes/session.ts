/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 *
 */
import {Device} from './device';

export class Session {
  public key: string;
  public device: Device;
  public data?: object[];
  public modifications: object;
}
