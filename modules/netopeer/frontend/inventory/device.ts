export class Device {
  constructor (
    public id: number,
    public hostname: string = '',
    public port: number = 830,
    public username: string = '',
    public password: string = ''
  ) {}
}
/*
export class Device {
  id: number;
  hostname: string;
  port: number = 830;
  username: string;
  password: string;
}
*/
