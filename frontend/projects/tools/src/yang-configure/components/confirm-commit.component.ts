/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Dialog to confirm or discard changes to the configuration
 */

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ConfigurationService, Session} from 'netconf-lib';
import {NodeControlService} from '../services/node-control.service';

@Component({
  selector: 'nct-confirm-commit',
  templateUrl: './confirm-commit.component.html',
  styleUrls: ['./confirm-commit.component.scss']
})
export class ConfirmCommitComponent implements OnInit {

  @Input() session: Session;
  @Output() shouldClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  error = '';

  constructor(public configurationService: ConfigurationService,
              public nodeControlService: NodeControlService) { }

  ngOnInit() {
  }

  commitChanges() {
    this.configurationService.commitChanges(this.session.key).subscribe(
      success => {
        if (!success.success) {
          this.error = success.message;
        } else {
          this.error = '';
          this.nodeControlService.confirmNewValue();
          this.shouldClose.emit(true);
        }
      },
      err => {
        this.error = err.message;
      }
    );
  }

  discardChanges() {
    this.nodeControlService.restoreOriginalValuesOnAll();
    this.configurationService.discardModifications(this.session.key);
    this.shouldClose.emit(true);
  }

}
