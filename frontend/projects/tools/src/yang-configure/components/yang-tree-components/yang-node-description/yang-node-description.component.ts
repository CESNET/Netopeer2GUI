import {Component, Input, OnInit} from '@angular/core';
import {NodeControlService} from '../../../services/node-control.service';

@Component({
  selector: 'nct-yang-node-description',
  templateUrl: './yang-node-description.component.html',
  styleUrls: ['./yang-node-description.component.scss']
})
export class YangNodeDescriptionComponent implements OnInit {

  @Input() description: string;
  showHelp = false;

  constructor(public nodeControlService: NodeControlService) { }

  ngOnInit() {
    this.nodeControlService.performNodeAction.subscribe(
      action => {
        if (action === 'showHelp') {
          this.showHelp = true;
        } else if (action === 'hideHelp') {
          this.showHelp = false;
        }
      }
    );
  }

}
