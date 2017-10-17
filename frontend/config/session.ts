import { Device } from '../inventory/device';

export class Session {
  constructor (
    public key: string,
    public device: Device,
  ) {}
}
