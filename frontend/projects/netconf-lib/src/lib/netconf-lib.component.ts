/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Library test component
 */

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'lib-nc',
  template: `
    <p>
      netconf-lib works!
    </p>
  `,
  styles: []
})
export class NetconfLibComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
