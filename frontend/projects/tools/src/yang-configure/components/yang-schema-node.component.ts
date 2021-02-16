/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A node of the configuration tree
 * This is a recursive component - renders all its children
 */
import {Component, OnInit, Input} from '@angular/core';
import {NodeControlService} from '../services/node-control.service';
// @ts-ignore
import {ConfigurationService, SchemasService, SessionService} from 'netconf-lib';

/**
 * Notes on the schema format
 * Has value -> cannot have children
 * Is key -> Cannot be deleted
 * Is not editable -> Cannot add or remove anything
 *
 * load node schema, not a leaf:
 * schema['node-name']['data'] - keys are possible children
 * schema['node-name']['keys'] - array of key names
 *
 * load node schema, is a leaf:
 * schema['node-name']['mandatory']: {value: "true"}
 * schema['node-name']['type']: basetype, derived from, etc etc...
 * */
@Component({
  selector: 'nct-yang-schema-node',
  templateUrl: './yang-schema-node.component.html',
  styleUrls: ['./yang-schema-node.component.scss']
})
export class YangSchemaNodeComponent implements OnInit {

  constructor(public nodeControlService: NodeControlService,
              public configurationService: ConfigurationService,
              public sessionService: SessionService,
              public schemaService: SchemasService) {
  }

  @Input() node: object;
  @Input() showChildren = false;
  @Input() activeSession;
  showAllChildrenOnOpen = false;
  showHelp = false;
  editing = false;
  originalValue;
  editingValue = '';
  showMenu = false;

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
    this.showAllChildrenOnOpen = !this.showAllChildrenOnOpen;
    this.showChildren = !this.showChildren;
  }

  toggleEdit() {
    this.editing = !this.editing;
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
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

  loadSchemaPath() {
    this.schemaService.getParsedSchema(
      'ietf-netconf-server@2019-07-02.yang', this.activeSession.key, this.node['info']['path']).subscribe(
      schema => {
        console.log('PARSED SCHEMA');
        console.log(schema);
      }
    );
  }

}
