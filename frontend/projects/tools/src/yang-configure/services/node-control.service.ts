/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * NodeControlService is responsible for performing operations on all nodes.
 * All yang tree nodes listen to the performNodeAction event emitter.
 */

import {EventEmitter, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NodeControlService {

  constructor() { }

  /**
   * Valid actions:
   * "hideHelp": hide help on all nodes
   * "showHelp": Show help on all nodes
   * "close": Close all node children
   */
  public performNodeAction: EventEmitter<string> = new EventEmitter<string>();

  hideHelpOnAll() {
    this.performNodeAction.emit('hideHelp');
  }

  showHelpOnAll() {
    this.performNodeAction.emit('showHelp');
  }

  closeAll() {
    this.performNodeAction.emit('close');
  }

  restoreOriginalValuesOnAll() {
    this.performNodeAction.emit('discardChanges');
  }



}
