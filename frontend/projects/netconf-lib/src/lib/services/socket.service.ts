/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Handle web socket communication
 */

import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket;

  constructor() {
    console.log('initSocket ' + window.location.origin);
    this.socket = socketIo.connect(window.location.origin);
  }

  send(event: string, message: any = null) {
    if (message) {
      this.socket.emit(event, message);
    } else {
      this.socket.emit(event);
    }
  }

  subscribe(event: string) {
    return new Observable<any>(observer => {
      this.socket.on(event, (data) => observer.next(data));
    });
  }

  unsubscribe(event: string) {
    this.socket.removeListener(event)
  }
}
