export class Device {
  constructor (
    public id: number,
    public name:string = '',
    public hostname: string = '',
    public port: number = 830,
    public autoconnect: boolean = false,
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
