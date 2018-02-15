import { Component } from '@angular/core';

@Component({
  selector : 'netopeer-inventory',
  templateUrl : './inventory.component.html',
  styleUrls : ['./inventory.component.scss']
})

export class InventoryComponent {
  title = 'Inventory';
  inventoryComponents = [
    'devices',
    'schemas'
  ];

  constructor() { }
}
