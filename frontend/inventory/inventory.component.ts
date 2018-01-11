import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector : 'netopeer-inventory',
  templateUrl : './inventory.component.html',
  styleUrls : ['./inventory.component.scss']
})

export class InventoryComponent implements OnInit {
  title = 'Inventory';
  inventoryComponents = [
    'devices',
    'schemas'
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
      /* redirect to default inventory */
      this.router.navigateByUrl('/netopeer/inventory/devices')
  }
}
