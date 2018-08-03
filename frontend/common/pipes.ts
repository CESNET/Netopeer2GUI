import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'noPrefix'})
export class NoPrefixPipe implements PipeTransform {
  transform(value: string): string {
    return value.slice(value.indexOf(':') + 1);
  }
}

@Pipe({name: 'prefixOnly'})
export class PrefixOnlyPipe implements PipeTransform {
  transform(value: string): string {
    return value.slice(0, value.indexOf(':'));
  }
}
