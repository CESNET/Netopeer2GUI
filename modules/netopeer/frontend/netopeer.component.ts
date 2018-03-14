import { Component } from '@angular/core';

class NComponent {
  route: string;
  name: string;
}

const NCOMPONENTS: NComponent[] = [
  { route : 'inventory', name: 'Inventory' },
  { route : 'config', name: 'Configuration' },
  { route : 'yang', name: 'YANG Explorer' },
  { route : 'monitoring', name: 'Monitoring' },
  { route : 'plugins', name: 'Plugins' }
];

@Component({
  selector : 'netopeer',
  templateUrl : './netopeer.component.html',
  styleUrls : ['./netopeer.scss'],
})

export class NetopeerComponent {
  componentTitle = '';
  netopeerComponents = NCOMPONENTS;

  onActivate(componentRef) {
    this.componentTitle = componentRef.title;
  }
  onDeactivate(componentRef) {
    this.componentTitle = '';
  }
}
