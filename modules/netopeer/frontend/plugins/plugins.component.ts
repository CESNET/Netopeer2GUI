import { Component, OnInit } from '@angular/core';

@Component({
  selector : 'netopeer-plugins',
  templateUrl : './plugins.component.html',
  styleUrls : ['./plugins.component.scss']
})

export class PluginsComponent implements OnInit {
  title = 'Plugins';
  text = "test... ignore";

  sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ngOnInit() {
      await this.sleep(2000);
      this.text = "still testing... still ignore";
  }
}
