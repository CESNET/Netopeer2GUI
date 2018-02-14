import {Component, Directive, ElementRef, EventEmitter, Input, Output, OnInit, ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';

import {Session} from './session';
import {ModificationsService} from './modifications.service';
import {SessionsService} from './sessions.service';
import {TreeService} from './config.component';

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
        console.log(this.node)
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
export class TreeCreate implements OnInit {
    @Input() node;
    @Input() indentation;
    activeSession: Session;

    constructor(private modsService: ModificationsService, private sessionsService: SessionsService) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getActiveSession();
    }

    closeCreatingDialog(node, reason='abort') {
        this.modsService.createClose(node, reason);
    }

    creatingDialogSelect(node, index, source) {
        this.modsService.create(this.activeSession, node, index);
        this.sessionsService.storeData();
        if (('schemaChildren' in node) && node['schemaChildren'].length) {
            source.selectedIndex = 0;
        }
    }
}

@Component({
    selector: 'tree-indent',
    templateUrl: 'tree-indent.html',
    styleUrls: ['./tree.component.scss']
})
export class TreeIndent implements OnInit {
    @Input() node;
    @Input() indentation;
    @Input() type = "current";
    activeSession: Session;
    timeout;

    constructor(private modsService: ModificationsService, private sessionsService: SessionsService) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getActiveSession();
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
        this.modsService.delete(this.activeSession, node);
        this.sessionsService.storeData();
    }

    openCreatingDialog(element, node, parent = false) {
        if (parent) {
            node = this.modsService.nodeParent(this.activeSession, node);
        }
        if (!('creatingChild' in node)) {
            this.sessionsService.childrenSchemas(this.activeSession.key, node['info']['path'], node).then(result => {
                this.modsService.createOpen(result, node);
            });
        } else if (element){
            /* scroll to the existing element */
            element.ownerDocument.getElementById(node['path'] + '_createChildDialog').scrollIntoView(false);
        }
    }

    closeCreatingDialog(node, reason='abort') {
        this.modsService.createClose(node, reason);
    }

    cancelModification(node) {
        this.modsService.cancelModification(this.activeSession, node, false);
        this.sessionsService.storeData();
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
                private treeService: TreeService,
                private changeDetector: ChangeDetectorRef) {}

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
        if ((node['info']['key'] && !node['new']) || node['deleted']) {
            return;
        }
        let parent = target.parentElement;

        this.modsService.setEdit(this.activeSession, node, true)
        this.changeDetector.detectChanges();

        parent.nextElementSibling.lastElementChild.focus();
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

    changeValueCancel(node) {
        if ('value' in node) {
            this.modsService.setEdit(this.activeSession, node, false);
        }
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

        this.modsService.change(this.activeSession, node, input.value);
        this.sessionsService.storeData();
    }

    newChildrenToShow(node) {
        if ('newChildren' in node) {
            return node['newChildren'];
        } else {
            return [];
        }
    }
}
