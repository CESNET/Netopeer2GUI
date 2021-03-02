/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * YANG Configure tool serve to view and edit device's configuration
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { YangConfigureComponent } from './components/yang-configure.component';
// @ts-ignore
import {NetconfLibModule} from 'netconf-lib';
import {HttpClientModule} from '@angular/common/http';
import { YangSchemaNodeComponent } from './components/yang-schema-node.component';
import {FormsModule} from '@angular/forms';
import { ConfirmCommitComponent } from './components/confirm-commit.component';
import { YangNewNodeComponent } from './components/yang-tree-components/yang-new-node/yang-new-node.component';
import { YangNodeDescriptionComponent } from './components/yang-tree-components/yang-node-description/yang-node-description.component';
import { YangSchemaLinkComponent } from './components/yang-tree-components/yang-schema-link/yang-schema-link.component';
import { YangNodeMenuComponent } from './components/yang-tree-components/yang-node-menu/yang-node-menu.component';
import { YangNodeEditableValueComponent } from './components/yang-tree-components/yang-node-editable-value/yang-node-editable-value.component';


@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    NetconfLibModule,
    RouterModule,
    FormsModule
  ],
  declarations: [YangConfigureComponent, YangSchemaNodeComponent, ConfirmCommitComponent, YangNewNodeComponent, YangNodeDescriptionComponent, YangSchemaLinkComponent, YangNodeMenuComponent, YangNodeEditableValueComponent],
  entryComponents: [YangConfigureComponent]
})
export class YangConfigureModule {
  static entry = YangConfigureComponent;
}
