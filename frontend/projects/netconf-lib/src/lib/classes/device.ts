/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 *
 */
export class Device {
  public id: string;
  public name? = '';
  public hostname = '';
  public port = 830;
  public username = '';
  public password?: string = '';
  public fingerprint? = '';
}
