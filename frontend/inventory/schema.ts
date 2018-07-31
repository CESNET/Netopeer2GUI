export class Schema {
  constructor (
    public key: string,
    public name: string = '',
    public revision: string = '',
    public type: string = '',
    public data: any = null
  ) {}
}
