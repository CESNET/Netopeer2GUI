import {Component, Input, OnInit, ChangeDetectorRef} from '@angular/core';

import {Session} from './session';
import {SessionsService} from './sessions.service';

@Component({
    selector: 'tree-view',
    templateUrl: './tree.component.html',
    styleUrls: ['../netopeer.css', './tree.component.css']
})

export class TreeView implements OnInit {
    @Input() treeData;
    @Input() indentation;
    c = 1; i = 1;
    activeSession: Session;
    constructor(private sessionsService: SessionsService, private changeDetector: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getActiveSession();
    }

    inheritIndentation(node) {
        let newIndent;
        if (node['last']) {
            newIndent = [true];
        } else {
            newIndent = [false];
        }

        if (!this.indentation) {
            return newIndent;
        } else {
            return this.indentation.concat(newIndent);
        }
    }

    startEditing(node, target) {        
        let parent = target.parentElement;

        node['edit'] = true;
        this.changeDetector.detectChanges();

        parent.nextElementSibling.lastElementChild.focus();        
    }
    
    checkValue(node, target) {
        let confirm = target.previousElementSibling;
        this.sessionsService.checkValue(this.activeSession.key, node['path'], target.value).subscribe(result => {
            if (result['success']) {
                target.classList.remove("invalid");
                confirm.style.visibility = "visible";
            } else {
                target.classList.add("invalid");
                confirm.style.visibility = "hidden";
            }
        });
    }
    
    changeValue(node, target) {
        let input;
        if (target.classList.contains('value')) {
            if (target.classList.contains('invalid')) {
                return;
            }
            input = target;            
        } else {
            input = target.nextElementSibling;
        }

        if (!this.activeSession.modifications) {
            this.activeSession.modifications = {};
        }
        if (!(node['path'] in this.activeSession.modifications)) {
            /* new record */
            if (node['value'] == input['value']) {
                /* no change to the original value */
                return;
            }
            this.activeSession.modifications[node['path']] = {};
            this.activeSession.modifications[node['path']]['type'] = 'change';
            this.activeSession.modifications[node['path']]['original'] = node['value'];
            this.activeSession.modifications[node['path']]['value'] = input.value;  
            node['dirty'] = true;          
        } else if (this.activeSession.modifications[node['path']]['type'] == 'change' &&
                   this.activeSession.modifications[node['path']]['original'] == input['value']) {
            /* change to the original value, remove the change record */
            delete this.activeSession.modifications[node['path']];
            node['dirty'] = false;
            
            if (!Object.keys(this.activeSession.modifications).length) {
                delete this.activeSession.modifications;
            }
        } else {
            /* another change of existing change record */
            this.activeSession.modifications[node['path']]['value'] = input.value;
            node['dirty'] = true;
        }
        console.log('Modifications list: ' + this.activeSession.modifications);
        
        node['value'] = input.value;
        node['edit'] = false;
        this.sessionsService.storeData();
    }

    expandable(node): boolean {
        if (node['info']['type'] == 1 || /* container */
            node['info']['type'] == 16) { /* list */
                return true;
        }
        return false;
    }

    hasHiddenChild(node, clean=false): boolean {
        if (!clean && 'hasHiddenChild' in node) {
            return node['hasHiddenChild'];
        }
        node['hasHiddenChild'] = false;
        if (!this.expandable(node)) {
            /* terminal node (leaf or leaf-list) */
            return node['hasHiddenChild'];
        } else if (!('children' in node)) {
            /* internal node without children */
            node['hasHiddenChild'] = true;
        } else {
            /* go recursively */
            for (let child of node['children']) {
                if (this.hasHiddenChild(child, clean)) {
                    node['hasHiddenChild'] = true;
                    break;
                }
            }
        }
        return node['hasHiddenChild'];
    }
    
    collapse(node) {
        delete node['children'];
        this.activeSession.dataVisibility = 'mixed';
        for (let iter of this.activeSession.data) {
            this.hasHiddenChild(iter, true);
        }
        this.sessionsService.storeData();
    }

    expand(node, all: boolean) {
        this.sessionsService.rpcGetSubtree(this.activeSession.key, all, node['path']).subscribe(result => {
            if (result['success']) {
                node['children'] = result['data']['children'];
                for (let iter of this.activeSession.data) {
                    this.hasHiddenChild(iter, true);
                }
                this.sessionsService.storeData();
            }
        });
    }
}
