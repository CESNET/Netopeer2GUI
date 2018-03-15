import {Component, Directive, ElementRef, EventEmitter, Input, Output, OnInit, ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';

import {Session} from './session';
import {Schema} from '../inventory/schema';
import {ModificationsService} from './modifications.service';
import {SessionsService} from './sessions.service';
import {TreeService} from './tree.service';
import {SchemasService} from '../yang/schemas.service';

@Directive({
    selector: '[treeScrollTo]'
})
export class TreeScrollTo {
    @Input() node;

    constructor(private elRef:ElementRef) {}
    ngAfterContentInit() {
        if (!('new' in this.node)) {
            let middle = this.elRef.nativeElement.getBoundingClientRect().top + window.pageYOffset - (window.innerHeight / 2);
            window.scrollTo(0, middle);
        }
    }
}

@Directive({
    selector: '[checkLeafValue]'
})
export class CheckLeafValue {
    @Input() node;
    @Input() trusted = false;
    @Output() onCheckValue = new EventEmitter();

    constructor(private elRef:ElementRef) {}

    ngAfterContentInit() {
        let node = this.node;
        let trusted = this.trusted;
        let element = this.elRef.nativeElement;
        element.value = node['value'];
        this.onCheckValue.emit({node, element, trusted});
  }
}

@Component({
    selector: 'tree-create',
    templateUrl: 'tree-create.html',
    styleUrls: ['./tree.component.scss']
})
export class TreeCreate {
    @Input() node;
    @Input() indentation;
    @Input() activeSession: Session;

    constructor(private modsService: ModificationsService, private sessionsService: SessionsService) {}

    closeCreatingDialog(node, abort:boolean = true) {
        this.modsService.createClose(this.activeSession, node, abort);
    }

    creatingDialogSelect(node, index, source) {
        this.modsService.create(this.activeSession, node, index);
        this.sessionsService.storeSessions();
        if (('schemaChildren' in node) && node['schemaChildren'].length) {
            source.selectedIndex = 0;
        }
    }
}

@Component({
    selector: 'tree-edit',
    templateUrl: 'tree-edit.html',
    styleUrls: ['./tree.component.scss']
})
export class TreeEdit {
    @Input() node;
    @Input() indentation;
    @Input() activeSession: Session;

    constructor(private treeService: TreeService,
                private modsService: ModificationsService,
                private sessionsService: SessionsService) {}

    changeValueCancel(node) {
        if ('value' in node) {
            this.modsService.setEdit(this.activeSession, node, false);
        } else {
            this.modsService.cancelModification(this.activeSession, node, false);
        }
        this.sessionsService.storeSessions();
    }

    changeValue(node, target) {
        let input;
        if (target.classList.contains('value_inline')) {
            if (target.classList.contains('invalid')) {
                return;
            }
            input = target;
        } else {
            input = target.nextElementSibling;
        }

        if (node['info']['type'] == 8) {
            this.modsService.change(this.activeSession, node, input.value);
        } else {
            this.modsService.change(this.activeSession, node, input.value);
        }
        this.sessionsService.storeSessions();
    }

    checkValue(node, target, trusted = false) {
        let confirm = target.previousElementSibling;
        let cancel = confirm.previousElementSibling;

        if (trusted) {
            /* value is selected from valid options */
            target.classList.remove("invalid");
            confirm.style.visibility = "visible";
            if ('value' in node) {
                cancel.style.visibility = "visible";
            }
            return;
        }

        let path: string;
        if ('creatingChild' in node) {
            path = node['creatingChild']['path'];
        } else {
            path = node['info']['path'];
        }
        this.sessionsService.checkValue(this.activeSession.key, path, target.value).subscribe(result => {
            if (result['success']) {
                target.classList.remove("invalid");
                confirm.style.visibility = "visible";
                if ('value' in node) {
                    cancel.style.visibility = "visible";
                }
            } else {
                target.classList.add("invalid");
                confirm.style.visibility = "hidden";
                if (!('value' in node)) {
                    cancel.style.visibility = "hidden";
                }
            }
        });
    }

    nodeValue(node, index:number = 0): string {
        if ('value' in node) {
            if (node['info']['type'] == 4) {
                return node['value'];
            } else if (node['info']['type'] == 8 && node['value'].length > index) {
                return node['value'][index];
            }
        }
        return null;
    }
}

@Component({
    selector: 'tree-indent',
    templateUrl: 'tree-indent.html',
    styleUrls: ['./tree.component.scss']
})
export class TreeIndent implements OnInit {
    @Input() node;
    @Input() value;
    @Input() indentation;
    @Input() type;
    activeSession: Session;
    private timeout;

    constructor(private treeService: TreeService,
                private modsService: ModificationsService,
                private sessionsService: SessionsService) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getSession();
    }

    getType():string {
        if (this.type) {
            return this.type;
        } else {
            if (this.node && ('new' in this.node)) {
                return "new";
            } else if (this.node && this.modsService.isDeleted(this.node)) {
                return "deleted";
            } else {
                return "current";
            }
        }
    }

    showEditMenu(event) {
        this.timeout = setTimeout(() => {
            let menu = event.target.lastElementChild;
            menu.style.visibility = "visible";
            menu.style.top = event.target.getBoundingClientRect().top + 'px';
            menu.style.left = event.target.getBoundingClientRect().left + (event.target.getBoundingClientRect().width / 2) + 'px';
        }, 300);
    }

    hideEditMenu(menu) {
        clearTimeout(this.timeout);
        menu.style.visibility = "hidden";
    }

    deleteSubtree(node) {
        let rmlist = [];
        if (node['info']['type'] == 8) {
            rmlist = this.treeService.nodesToShow(this.activeSession, node);
        } else {
            rmlist.push(node);
        }
        for (let item of rmlist) {
            this.modsService.delete(this.activeSession, item);
        }
        this.sessionsService.storeSessions();
    }

    deleteInstance(node) {
        this.modsService.delete(this.activeSession, node);
        this.sessionsService.storeSessions();
    }

    openCreatingDialog(element, node, parent = false) {
        if (parent) {
            node = this.treeService.nodeParent(this.activeSession, node);
        }
        if (!('creatingChild' in node)) {
            this.sessionsService.childrenSchemas(this.activeSession.key, node).then(result => {
                console.log(node)
                this.modsService.createOpen(this.activeSession, result, node);
            });
        } else if (element){
            /* scroll to the existing element */
            element.ownerDocument.getElementById(node['path'] + '_createChildDialog').scrollIntoView(false);
        }
    }

    closeCreatingDialog(node, abort:boolean = true) {
        this.modsService.createClose(this.activeSession, node, abort);
    }

    cancelModification(node, value = false) {
        console.log(node['path'])
        console.log(value)
        if (node['info']['type'] == 8 && !value) {
            for (let item of this.treeService.nodesToShow(this.activeSession, node)) {
                console.log(item['path'])
                this.modsService.cancelModification(this.activeSession, item, false, true);
            }
        } else if (value) {
            this.modsService.cancelModification(this.activeSession, node, false, false);
        } else {
            this.modsService.cancelModification(this.activeSession, node, false, true);
        }
        this.sessionsService.storeSessions();
    }
}

@Component({
    selector: 'tree-leaflist-value',
    template: `
        <div class="node yang-leaflist-value" [class.dirty]="node['dirty']" [class.deleted]="modsService.isDeleted(node, true)">
            <tree-indent [node]="node" [indentation]="treeService.inheritIndentation(indentation, node)" [type]="'value'" [value]="value"></tree-indent>
            <div class="value_standalone">{{node['value']}}</div>
        </div>
        <tree-edit *ngIf="node['edit']" [node]="node" [indentation]="indentation" [activeSession]="activeSession"></tree-edit>`,
    styleUrls: ['./tree.component.scss']
})

export class TreeLeaflistValue {
    @Input() node;
    @Input() activeSession: Session;
    @Input() indentation;

    constructor(private modsService: ModificationsService,
                private treeService: TreeService) {}
}

@Component({
    selector: 'tree-node',
    templateUrl: './tree-node.html',
    styleUrls: ['./tree.component.scss']
})

export class TreeNode {
    @Input() node;
    @Input() indentation;
    @Input() activeSession: Session;

    constructor(private modsService: ModificationsService,
                private sessionsService: SessionsService,
                private treeService: TreeService,
                private schemasService: SchemasService,
                private changeDetector: ChangeDetectorRef,
                private router: Router) {}

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

    isEditable(node) {
        if ((node['info']['key'] && !node['new']) || node['deleted']) {
            return false;
        }
        return true;
    }

    startEditing(node, target) {
        if (!this.isEditable(node)) {
            return;
        }

        let container = target.parentElement.parentElement;

        this.modsService.setEdit(this.activeSession, node, true);
        this.changeDetector.detectChanges();

        container.nextElementSibling.lastElementChild.focus();
    }

    showSchema(node) {
        let schema = new Schema;
        let at = node['info']['module'].indexOf('@');
        if (at == -1) {
            schema.name = node['info']['module'];
        } else {
            schema.name = node['info']['module'].substring(0, at);
            schema.revision = node['info']['module'].substring(at + 1);
        }
        let key = node['info']['module'] + '.yang';

        schema.name = this.treeService.moduleName(node);
        this.schemasService.show(key, schema);
        this.schemasService.changeActiveSchemaKey(key);
        this.router.navigateByUrl( '/netopeer/yang' );
    }

    newChildrenToShow(node) {
        if ('newChildren' in node) {
            return node['newChildren'];
        } else {
            return [];
        }
    }
}

@Component({
    selector: 'tree-view',
    templateUrl: './tree.component.html',
    styleUrls: ['./tree.component.scss']
})

export class TreeView implements OnInit {
    @Input() node;
    @Input() indentation;
    activeSession: Session;

    constructor(private modsService: ModificationsService,
                private sessionsService: SessionsService,
                private treeService: TreeService) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getSession();
    }
}

