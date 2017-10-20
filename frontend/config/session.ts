import { Device } from '../inventory/device';

export class Session {
  constructor (
    public key: string,
    public device: Device,
    public data: string = "",
    public cpblts: string = "",
    public dataVisibility: boolean = false,
    public cpbltsVisibility: boolean = false
  ) {}
}
