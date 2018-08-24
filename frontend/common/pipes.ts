import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

@Pipe({name: 'patternHighlight'})
export class PatternHighlightPipe implements PipeTransform {
    constructor(private _sanitizer:DomSanitizer) {}

    transform(value: string): SafeHtml {
        let result = '';
        for(let i = 0; i < value.length; i++) {
            if (value[i] == '(' || value[i] == '[' || value[i] == '{') {
                result = result.concat(`<span onmouseover="event.stopPropagation();event.currentTarget.classList.add('selectedGroup');" onmouseout="event.stopPropagation();event.currentTarget.classList.remove('selectedGroup');"><span class="bracket">` + value[i] + `</span>`);
            } else if (value[i] == ')' || value[i] == ']' || value[i] == '}') {
                let data = value[i];
                if (i + 1 < value.length && (value[i+1] == '?' || value[i+1] == '+' || value[i+1] == '*')) {
                    i;
                    data = value.slice(i, i + 2);
                    i++;
                }
                result = result.concat(`<span class="bracket">` + data + `</span></span>`);
            } else {
                result = result.concat(value[i]);
            }
        }
        return this._sanitizer.bypassSecurityTrustHtml(result);
  }
}