/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A node of the configuration tree
 * This is a recursive component - renders all its children
 */
import { Component, OnInit, Input } from '@angular/core';
import {NodeControlService} from '../services/node-control.service';
// @ts-ignore
import {ConfigurationService, SessionService} from 'netconf-lib';

@Component({
  selector: 'nct-yang-schema-node',
  templateUrl: './yang-schema-node.component.html',
  styleUrls: ['./yang-schema-node.component.scss']
})
export class YangSchemaNodeComponent implements OnInit {

  constructor(public nodeControlService: NodeControlService,
              public configurationService: ConfigurationService,
              public sessionService: SessionService) { }

  @Input() node: object;
  @Input() showChildren = false;
  @Input() activeSession;
  showAllChildrenOnOpen = false;
  showHelp = false;
  editing = false;
  originalValue = '';
  editingValue = '';

  ngOnInit() {
    this.showAllChildrenOnOpen = this.showChildren;
    this.nodeControlService.performNodeAction.subscribe(
      action => {
        this.performGlobalAction(action);
      }
    );
    if (this.node['value']) {
      this.originalValue = this.node['value'];
      this.editingValue = this.node['value'];
    }
  }

  toggleChildren() {
    this.showAllChildrenOnOpen = false;
    this.showChildren = !this.showChildren;
  }

  toggleAllChildren() {
    this.showAllChildrenOnOpen = ! this.showAllChildrenOnOpen;
    this.showChildren = !this.showChildren;
  }

  toggleEdit() {
    this.editing = !this.editing;
  }

  performGlobalAction(action: string) {
    switch (action) {
      case 'hideHelp':
        this.showHelp = false;
        break;
      case 'showHelp':
        this.showHelp = true;
        break;
      case 'close':
        this.showChildren = false;
        this.showAllChildrenOnOpen = false;
        break;
      case 'discardChanges':
        this.restoreOriginal();
        break;
    }
  }

  confirmEdit() {
    this.editing = false;
    this.sessionService.createChangeModification(this.activeSession.key, this.node['info']['path'], this.node, this.editingValue);
    this.sessionService.modificationAdded.emit(this.activeSession);
    this.node['value'] = this.editingValue;
  }

  restoreOriginal() {
    this.editingValue = this.originalValue;
    this.node['value'] = this.originalValue;
  }

}
