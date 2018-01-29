import { Component, ViewEncapsulation, Input} from '@angular/core';

@Component({
  selector : 'netopeer-loading',
  templateUrl : './loading.component.html',
  styleUrls : ['./loading.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class LoadingComponent {
    @Input() spinner = false;
    @Input() diameter = 50;
    @Input() strokeWidth = 7;
}
