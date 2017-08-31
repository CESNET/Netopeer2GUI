import { Component } from '@angular/core';

@Component({
  selector : 'netopeer-inventory',
  templateUrl : './inventory.component.html',
  styleUrls : ['./inventory.component.css']
})

export class InventoryComponent {
  title = 'Inventory';
  inventoryComponents = [
    'devices',
    'schemas'
  ];
}
