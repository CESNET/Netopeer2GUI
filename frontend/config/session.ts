import { Device } from '../inventory/device';

export class Session {
  constructor (
    public key: string,
    public device: Device,
    public data = null,
    public modifications = null,
    public cpblts: string = "",
    public dataVisibility: string = 'none',
    public statusVisibility: boolean = true,
    public cpbltsVisibility: boolean = false,
  ) {}
}
