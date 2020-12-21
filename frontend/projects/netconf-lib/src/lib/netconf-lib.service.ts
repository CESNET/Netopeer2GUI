/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Demo service for testing the library
 */

import {Injectable} from '@angular/core';

export * from './services/configuration.service';


@Injectable({
  providedIn: 'root'
})
export class NetconfLibService {

  constructor() {
  }

  public provideExample(): string {
    return 'Example service works!';
  }


}
