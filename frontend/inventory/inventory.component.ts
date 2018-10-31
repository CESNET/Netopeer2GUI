import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

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

@Component({
    selector: 'ngbd-modal-content',
    styleUrls: ['../netopeer.scss'],
    template: `<div class="modal-header">
        <h4 class="modal-title">Missing YANG Schema</h4>
    </div>
    <div class="modal-body">
        <label>The device utilize YANG schema <b>{{info.name}}</b> <ng-container *ngIf="info.revision">in revision <b>{{info.revision}}</b></ng-container>.<br/>
        <span *ngIf="!info['submod_name']">Please provide this schema.</span>
        <span *ngIf="info['submod_name']">Please provide submodule <b>{{info['submod_name']}}</b> <ng-container *ngIf="info['submod_revision']">in revision <b>{{info['submod_revision']}}</b></ng-container> for this schema.</span>
        </label><br/>
        <input id="uploadSchema" #uploadSchema type="file" (change)="upload(uploadSchema.files[0])" name="schema" placeholder="Upload schema"/>
    </div>
    <div class="modal-footer">
        <button class="btn btn-light" (click)="activeModal.dismiss(null)">cancel</button>
    </div>`
})
export class DialogueSchema implements OnInit {
    @Input() info;
    password = '';

    constructor(public activeModal: NgbActiveModal) { }

    upload(schema: File) {
        let reader = new FileReader();

        console.log(schema);
        reader.onloadend = () => {
            //console.log(reader.result);
            this.activeModal.close({'filename': schema.name, 'data': reader.result});
        };
        reader.readAsText(schema);
    }

    ngOnInit(): void {
        document.getElementById('uploadSchema').focus();
    }
}