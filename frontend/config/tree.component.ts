import {Component, Directive, ElementRef, EventEmitter, Input, Output, OnInit, ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';

import {Session} from './session';
import {SessionsService} from './sessions.service';

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
    @Output() onCheckValue = new EventEmitter();

    constructor(private elRef:ElementRef) {}
    ngAfterContentInit() {
        console.log(this.node)
        let node = this.node;
        let element = this.elRef.nativeElement;
        element.value = node['value'];
        this.onCheckValue.emit({node, element});
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
    @Output() onShowEditMenu = new EventEmitter();
    @Output() onDeleteSubtree = new EventEmitter();
    @Output() onOpenCreatingDialog = new EventEmitter();
    @Output() onCloseCreatingDialog = new EventEmitter();
    activeSession: Session;
    timeout;

    constructor(private sessionsService: SessionsService, private router: Router) {}

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
        this.onDeleteSubtree.emit(node);
    }
    openCreatingDialog(element, node, parent) {
        this.onOpenCreatingDialog.emit({element, node, parent});
    }
    closeCreatingDialog(node) {
        this.onCloseCreatingDialog.emit(node);
    }
}

@Component({
    selector: 'tree-view',
    templateUrl: './tree.component.html',
    styleUrls: ['./tree.component.scss']
})

export class TreeView implements OnInit {
    @Input() node;
    @Input() root;
    @Input() indentation;
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
        if (node['info']['key'] && !node['new']) {
            return;
        }
        let parent = target.parentElement;

        this.setNodeEdit(node, true)
        this.changeDetector.detectChanges();

        parent.nextElementSibling.lastElementChild.focus();
    }

    checkValue(node, target) {
        let confirm = target.previousElementSibling;
        let cancel = confirm.previousElementSibling;
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
            node['edit'] = false;
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

        if (!('new' in node)) {
            let record = this.sessionsService.createModificationsRecord(node['path']);
            if (!('type' in record)) {
                console.log(record);
                /* new record */
                if (node['value'] == input['value']) {
                    /* no change to the original value */
                    this.setNodeEdit(node, false);
                    this.sessionsService.removeModificationsRecord();
                    return;
                }
                record['type'] = 'change';
                record['original'] = node['value'];
                record['value'] = input.value;
                node['dirty'] = true;
            } else if (record['type'] == 'change' && record['original'] == input['value']) {
                console.log(record);
                /* change to the original value, remove the change record */
                this.sessionsService.removeModificationsRecord(node['path']);
                node['dirty'] = false;
            } else {
                console.log(record);
                /* another change of existing change record */
                record['value'] = input.value;
                node['dirty'] = true;
            }
            console.log(this.activeSession.modifications);
        }

        node['value'] = input.value;
        this.setNodeEdit(node, false);
        console.log(this.activeSession.data);
        this.sessionsService.storeData();
    }

    deleteSubtree(node) {
        if ('new' in node) {
            /* removing newly created subtree */
            let parent = this.nodeParent(node);
            if ('new' in parent) {
                /* removing just a subtree of the created tree */
                for (let i in parent['children']) {
                    if (parent['children'][i] == node) {
                        parent['children'].splice(i, 1);
                        break;
                    }
                }
            } else {
                this.sessionsService.removeModificationsRecord(node['path']);
                for (let i in parent['newChildren']) {
                    if (parent['newChildren'][i]['path'] == node['path']) {
                        parent['newChildren'].splice(i, 1);
                        break;
                    }
                }
                if (!parent['newChildren'].length) {
                    delete parent['newChildren'];
                }
            }
        } else {
            let record = this.sessionsService.createModificationsRecord(node['path']);

            if (!('type' in record)) {
                /* new record */
                record['type'] = 'delete';
                node['deleted'] = true;
                node['dirty'] = true;
            } else if (record['type'] == 'change') {
                record['type'] = 'delete';
                node['value'] = record['original'];
                delete record['original'];
                delete record['value'];
                node['deleted'] = true;
            }
        }
        console.log(this.activeSession.modifications);
        this.sessionsService.storeData();
    }

    nodeParent(node) {
        let match = false;
        let parent = null;
        let children = this.activeSession.data;
        let newChildren;
        while (children || newChildren) {
            match = false;

            if (children) {
                for (let iter of children) {
                    if (node['path'] == iter['path']) {
                        match = true;
                        children = null;
                        newChildren = null;
                        break;
                    } else if (node['path'].startsWith(iter['path'] + '/')) {
                        match = true;
                        parent = iter;
                        children = iter['children'];
                        if (('new' in node) && ('newChildren' in iter)) {
                            newChildren = iter['newChildren'];
                        } else {
                            newChildren = null;
                        }
                        break;
                    }
                }
                if (!match) {
                    children = null;
                }
            }
            if (match) {
                continue;
            }
            if (newChildren) {
                for (let iter of newChildren) {
                    if (node['path'] == iter['path']) {
                        match = true;
                        children = null;
                        newChildren = null;
                        break;
                    } else if (node['path'].startsWith(iter['path'] + '/')) {
                        match = true;
                        parent = iter;
                        children = iter['children'];
                        if (('new' in node) && ('newChildren' in iter)) {
                            newChildren = iter['newChildren'];
                        } else {
                            newChildren = null;
                        }
                        break;
                    }
                }
                if (!match) {
                    children = null;
                }
            }
        }
        if (!parent) {
            parent = this.root;
        }

        return parent;
    }

    schemaInfoName(parentNode, childSchema):string {
        if (parentNode['info']['module'] != childSchema['module']) {
            return childSchema['module'] + ':' + childSchema['name'];
        } else {
            return childSchema['name'];
        }
    }

    setNodeEdit(node, value) {
        if (value && node['info']['datatypebase'] == 'empty') {
            node['value'] = '';
            return;
        }
        node['edit'] = value;
    }

    creatingDialogSelect(node, index, source) {
        let newNode = {};
        newNode['new'] = true;
        newNode['info'] = node['schemaChildren'][index];
        if (node['path'] == '/') {
            newNode['path'] = '/' + this.schemaInfoName(node, newNode['info']);
        } else {
            newNode['path'] = node['path'] + '/' + this.schemaInfoName(node, newNode['info']);
        }
        newNode['dirty'] = true;

        if ('new' in node) {
            if (!('children' in node)) {
                node['children'] = []
            }
            node['children'].push(newNode)
        } else {
            if (!('newChildren' in node)) {
                node['newChildren'] = [];
            }
            node['newChildren'].push(newNode);
        }

        switch(newNode['info']['type']) {
        case 1: { /* container */
            newNode['children'] = [];
            node['schemaChildren'].splice(index, 1);
            this.openCreatingDialog(null, newNode);
            break;
        }
        case 4: { /* leaf */
            newNode['value'] = newNode['info']['default'];
            this.setNodeEdit(newNode, true)
            node['schemaChildren'].splice(index, 1);
            break;
        }
        case 16: { /* list */
            let search;
            if ('new' in node) {
                search = node['children'];
            } else {
                search = node['newChildren'];
            }
            let pos = 1;
            if (search.length) {
                for (let sibling of search) {
                    console.log(sibling);
                    console.log('testing ' + sibling['path'].substr(0, newNode['path'].length + 1));
                    if (sibling['path'].substr(0, newNode['path'].length + 1) == newNode['path'] + '[') {
                        console.log(sibling['path'].substring(newNode['path'].length + 1))
                        let n = parseInt(sibling['path'].substring(newNode['path'].length + 1));
                        console.log('found ' + n + ' in ' + sibling['path'])
                        if (n >= pos) {
                            pos = n + 1;
                        }
                    }
                }
            }
            newNode['path'] = newNode['path'] + '[' + pos + ']';
            console.log(newNode['path'])

            newNode['children'] = [];
            this.openCreatingDialog(null, newNode);

            /* wait to receive schemaChildren of the list */
            (function wait(context, flag: boolean) {
                console.log(context)
                setTimeout(() => {
                    if ('schemaChildren' in newNode) {
                        if (newNode['schemaChildren'].length) {
                            console.log(newNode);
                            for (let i in newNode['schemaChildren']) {
                                if (!newNode['schemaChildren'][i]['key']) {
                                    continue;
                                }
                                let newKey = {};
                                newKey['new'] = true;
                                newKey['key'] = true;
                                newKey['info'] = newNode['schemaChildren'][i];
                                newKey['path'] = newNode['path'] + '/' + context.schemaInfoName(newNode, newKey['info']);
                                newKey['dirty'] = true;
                                context.setNodeEdit(newKey, true)
                                newNode['children'].push(newKey)
                                newNode['schemaChildren'].splice(i, 1);
                            }
                        }
                    } else {
                        this.wait(context, true);
                    }
                }, 10);
            })(this, true);
            break;
        }
        }
        if (!node['schemaChildren'].length) {
            newNode['last'] = true;
            this.closeCreatingDialog(node, 'success');
        } else {
            source.selectedIndex = 0;
        }

        if (!('new' in node)) {
            let record = this.sessionsService.createModificationsRecord(newNode['path']);
            record['type'] = 'create';
            record['data'] = newNode;
        }
        console.log(newNode)
    }

    openCreatingDialog(element, node, parent = false) {
        if (parent) {
            node = this.nodeParent(node);
        }
        if (!('creatingChild' in node)) {
            this.sessionsService.childrenSchemas(this.activeSession.key, node['info']['path'], node).then(result => {
                console.log(result)
                node['schemaChildren'] = result;
                node['creatingChild'] = {};
            });
        } else if (element){
            /* scroll to the existing element */
            element.ownerDocument.getElementById(node['path'] + '_createChildDialog').scrollIntoView(false);
        }
        if (('children' in node) && node['children'].length) {
            node['children'][node['children'].length - 1]['last'] = false;
        }
        console.log(node);
    }

    closeCreatingDialog(node, reason='abort') {
        console.log(node)
        if (reason == 'abort' && ('children' in node) && node['children'].length) {
            node['children'][node['children'].length - 1]['last'] = true;
        }
        delete node['creatingChild'];
        delete node['schemaChildren'];
        if ('new' in node && !node['children'].length) {
            let parent = this.nodeParent(node);
            for (let i in parent['children']) {
                if (parent['children'][i] == node) {
                    if (!('schemaChildren' in parent)) {
                        parent['schemaChildren'] = [];
                        parent['creatingChild'] = {};
                    }
                    parent['schemaChildren'].push(node['info']);
                    parent['children'].splice(i, 1);
                    break;
                }
            }
        }
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
        node['loading'] = true;
        this.sessionsService.rpcGetSubtree(this.activeSession.key, all, node['path']).subscribe(result => {
            if (result['success']) {
                node['children'] = result['data']['children'];
                for (let iter of this.activeSession.data) {
                    this.hasHiddenChild(iter, true);
                }
                delete node['loading'];
                this.sessionsService.storeData();
            }
        });
    }

    newChildrenToShow(node) {
        if ('newChildren' in node) {
            return node['newChildren'];
        } else {
            return [];
        }
    }
}
