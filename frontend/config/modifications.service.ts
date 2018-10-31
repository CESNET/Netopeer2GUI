import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { Session, Node, NodeSchema } from './session';
import { SessionsService } from './sessions.service';
import { TreeService } from './tree.service';

/**
 * Enumeration of the ModificationRecord types.
 */
export const enum ModificationType {
    /** Creating a new node */
    Create = "create",
    /** Changing value of a current leaf node */
    Change = "change",
    /** Delete a current node */
    Delete = "delete",
    /** Replacing a current node */
    Replace = "replace",
    /** Reordering user-ordered lists or leaf-lists */
    Reorder = "reorder"
}

/**
 * Record of a particular modification on configuration data.
 */
export class ModificationRecord {}

/**
 * Service to handle modification records stored in the Session. The class does not
 * provide any storage, it just implements functions to manipulate with the records
 * stored in particular Session.
 */
@Injectable()
export class ModificationsService {

    /**
     * Initiate services handlers.
     * @param sessionsService Handler to get data from the current activeSession.
     * @param treeService Handler to control data tree.
     * @param router Handler to redirect to other pages.
     */
    constructor(private sessionsService: SessionsService,
                private treeService: TreeService,
                private router: Router) {}

    /**
     * Get the Modification record for the given path, if the record does not
     * exist, a new one is created and returned to fill. If there are no records
     * so far, the Modifications list is created as dictionary.
     * @param activeSession Session to work with.
     * @param path Identifier of the modified node.
     * @returns Modification record for the given path.
     */
    createModificationsRecord(activeSession: Session, path: string): ModificationRecord {
        if (!activeSession.modifications) {
            activeSession.modifications = {};
        }

        if (!(path in activeSession.modifications)) {
            activeSession.modifications[path] = new ModificationRecord();
        }
        return activeSession.modifications[path];
    }

    /**
     * Get the Modification record for the given path, if the record
     * exist in the provided activeSession.
     * @param activeSession Session to work with.
     * @param path Identifier of the modified node.
     * @returns Modification record for the specified path or null
     * if there is no record for the given path.
     */
    getModificationsRecord(activeSession: Session, path: string): ModificationRecord {
        if (!activeSession.modifications) {
            return null;
        }

        if (!(path in activeSession.modifications)) {
            return null;
        }
        return activeSession.modifications[path];
    }

    /**
     * Remove the Modification record from the given activeSession. If it
     * is the last record, the Modifications list is removed.
     * @param activeSession Session to work with.
     * @param path Identifier of the modified node.
     */
    removeModificationsRecord(activeSession: Session, path: string = null): void {
        if (!activeSession.modifications) {
            return;
        }

        if (path && (path in activeSession.modifications)) {
            delete activeSession.modifications[path];
        }

        if (!Object.keys(activeSession.modifications).length) {
            delete activeSession.modifications;
        }
    }

    /**
     * Change the key of a particular record in the Modifications list of the
     * given activeSession.
     * @param activeSession Session to work with.
     * @param oldPath The current Identifier of the modified node used as a key.
     * @param newPath New value of the key for the Modification record so far
     * identified by oldPath.
     */
    renameModificationsRecord(activeSession: Session, oldPath: string, newPath: string): void {
        let record = this.getModificationsRecord(activeSession, oldPath);
        if (record) {
            activeSession.modifications[newPath] = record;
            delete activeSession.modifications[oldPath];
        }
    }

    /**
     * Set edit flag of the node to the given set value.
     * @param activeSession Session to work with.
     * @param node Node to work with.
     * @param set True to set, False to unset.
     */
    setEdit(activeSession: Session, node: Node, set: boolean = true): void {
        let waiting = false;
        if (set && node['info']['datatypebase'] == 'empty') {
            node['value'] = '';
            return;
        }
        if (set && !('values' in node['info'])) {
            switch (node['info']['datatypebase']) {
            case 'bits':
            case 'enumeration':
                waiting = true;
                this.sessionsService.schemaValues(activeSession.key, node).subscribe(result => {
                    if (result['success']) {
                        node['info']['values'] = result['data'];
                    }
                    node['edit'] = set;
                });
                break;
            case 'boolean':
                node['info']['values'] = ['true', 'false'];
                break;
            }
            /* TODO instance identifiers, leafrefs */
        }
        if (!waiting) {
            node['edit'] = set;
        }
    }

    /**
     * Checker function to get know if the node was marked as deleted.
     * @param node Node to be checked.
     * @param value Flag for leaf-lists, true if the specific instance node is
     * supposed to be checked, false in case any of the instances counts.
     * @returns true if the node was marked as deleted, false otherwise.
     */
    isDeleted(node: Node, value: boolean = false): boolean {
        if ('deleted' in node) {
            return node['deleted'];
        } else if (!value && node['info']['type'] == 8) {
            for (let item of this.treeService.nodesToShow(this.sessionsService.getSession(), node)) {
                if (item['deleted']) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Checker function to get know if some instance of the list or leaf-list
     * was moved (reordered).
     * @param activeSession Session to work with.
     * @param node Node to be checked.
     * @returns true if there is a moved instance of the given list or leaf-list.
     */
    isMoved(activeSession: Session, node: Node): boolean {
       let path = this.treeService.pathCutPredicate(node['path']);
       let record = this.getModificationsRecord(activeSession, path);
       if (record && record['type'] == ModificationType.Reorder) {
            return true;
        }
        return false;
    }

    /**
     * Physically remove the specific node from the parent's child list
     * @param activeSession Session to work with
     * @param parent Parent to be modified.
     * @param childArray Name of the children array: 'children' or 'newChildren'
     * @param node Node to be removed.
     */
    private deleteChild(activeSession: Session, parent: Node, childArray: string, node: Node): void {
        for (let i in parent[childArray]) {
            if (parent[childArray][i]['path'] == node['path']) {
                parent[childArray].splice(i, 1);
                break;
            }
        }
        if (childArray != 'children' && !parent[childArray].length) {
            delete parent[childArray];
        }
    }

    /**
     * Delete the given node from the configuration data. If the node exists
     * only in frontend's data (created but not committed), it is physically
     * removed. Otherwise, it is marked as deleted (checkable via isDeleted())
     * and Modification record is created.
     * @param activeSession Session to work with.
     * @param node Node to delete.
     */
    delete(activeSession: Session, node: Node): void {
        if ('new' in node) {
            if (node['info']['ordered']) {
                let path = this.treeService.pathCutPredicate(node['path']);
                let record = this.getModificationsRecord(activeSession, path);
                let siblings = this.treeService.nodesToShow(activeSession, node);
                for (let item of siblings) {
                    if (record && ('reorder' in record)) {
                        let orig_order = record['reorder'][item['order']];
                        if (orig_order > record['reorder'][node['order']]) {
                            record['reorder'].splice(item['order'], 1, orig_order - 1);
                        }
                    }
                    if (item['order'] > node['order']) {
                        item['order'] = item['order'] - 1;
                    }
                }
                if (record && ('reorder' in record)) {
                    record['reorder'].splice(node['order'], 1);
                    let same = true;
                    for (let item of siblings) {
                        if (item['order'] != record['reorder'][item['order']]) {
                            same = false;
                            break;
                        }
                    }
                    if (same) {
                        this.removeModificationsRecord(activeSession, this.treeService.pathCutPredicate(node['path']));
                    }
                }
            }
            /* removing newly created subtree */
            let parent = this.treeService.nodeParent(activeSession, node);
            if ('new' in parent) {
                /* removing just a subtree of the created tree */
                this.deleteChild(activeSession, parent, 'children', node);
            } else {
                this.removeModificationsRecord(activeSession, node['path']);
                this.deleteChild(activeSession, parent, 'newChildren', node);
            }
        } else {
            let record = this.createModificationsRecord(activeSession, node['path']);
            node['deleted'] = true;
            if (!('type' in record)) {
                /* new record */
                record['type'] = ModificationType.Delete;
                record['original'] = node;
                node['dirty'] = true;
            } else if (record['type'] == ModificationType.Change) {
                record['type'] = ModificationType.Delete;
                node['value'] = record['original'];
                delete record['original'];
                delete record['value'];
            }
        }
    }

    /**
     * Change value of the given leaf Node. If the Node exists only in
     * frontend's data (created but not committed), the changed value will be
     * reflected in the create modification record. Otherwise, new record is
     * created.
     * @param activeSession Session to work with.
     * @param node Leaf node to be changed.
     * @param leafValue New value of the leaf node
     */
    change(activeSession: Session, node: Node, leafValue: string) {
        let record = null;
        if (!('new' in node)) {
            record = this.createModificationsRecord(activeSession, node['path']);
            if (!('type' in record)) {
                /* new record */
                if (node['value'] == leafValue) {
                    /* no change to the original value */
                    this.setEdit(activeSession, node, false);
                    this.removeModificationsRecord(activeSession);
                    return;
                }
                record['type'] = ModificationType.Change;
                record['original'] = node['value'];
                record['value'] = leafValue;
                node['dirty'] = true;
            } else if (record['type'] == ModificationType.Change && record['original'] == leafValue) {
                /* change back to the original value, remove the change record */
                this.removeModificationsRecord(activeSession, node['path']);
                node['dirty'] = false;
            } else {
                /* another change of existing change record */
                record['value'] = leafValue;
                node['dirty'] = true;
            }
        } else if (node['info']['type'] == 8) {
            record = this.getModificationsRecord(activeSession, node['path']);
            let newPath = node['path'].slice(0, node['path'].lastIndexOf('[')) + '[.=\'' + leafValue + '\']';
            this.renameModificationsRecord(activeSession, node['path'], newPath);
            node['path'] = newPath
        } else if (node['info']['key']) {
            let parent = this.treeService.nodeParent(activeSession, node);
            parent['keys'].splice(parent['info']['keys'].indexOf(node['info']['name']),1, leafValue);

            /* hack to render changed keys of list - go to some other page and then come back */
            this.router.navigateByUrl('/netopeer').then(() => {this.router.navigateByUrl('/netopeer/config');});
        }

        node['value'] = leafValue;
        this.setEdit(activeSession, node, false);
    }

    /**
     * Open creating dialogue by setting necessary flags on given parent node.
     * @param activeSession Session to work with.
     * @param schemas List of available schema nodes for the node's children.
     * @param node Parent node where a new children is supposed to be created.
     */
    createOpen(activeSession: Session, schemas: NodeSchema[], node: Node): void {
        //console.trace();
        node['schemaChildren'] = schemas;
        node['creatingChild'] = {};

        if (schemas.length) {
            let children = this.treeService.childrenToShow(node);
            if (children.length) {
                let last = children[children.length - 1];
                if (last['info']['type'] == 16) {
                    let instances = this.treeService.getInstances(activeSession, last);
                    last = instances[instances.length - 1];
                }
                delete last['last'];
                if (last['info']['type'] == 8) {
                    for (let sibling of this.treeService.getInstances(activeSession, last)) {
                        if ('last' in sibling) {
                            continue;
                        }
                        delete sibling["lastLeafList"];
                    }
                }
            }
        }
    }

    /**
     * Set the 'last' flag to the correct child node, does not remove the flag
     * on wrong children. Correctly goes thogh both, 'children' as well as
     * 'newChildren' lists.
     * @param activeSession Session to work with.
     * @param parent Parent node to be processed.
     */
    private maintainLast(activeSession: Session, parent: Node): void {
        if ('schemaChildren' in parent) {
            return;
        }
        let children = this.treeService.childrenToShow(parent);
        if (children.length) {
            let last = children[children.length - 1];
            if (last['info']['type'] == 16) {
                let instances = this.treeService.getInstances(activeSession, last);
                last = instances[instances.length - 1];
            }
            last['last'] = true;
            if (last['info']['type'] == 8) {
                for (let sibling of this.treeService.getInstances(activeSession, last)) {
                    if ('last' in sibling) {
                        continue;
                    }
                    sibling["lastLeafList"] = true;
                }
            }
        }
    }

    /**
     * Close creating dialogue by removing flags from the given parent node.
     * @param activeSession Session to work with.
     * @param node Parent node where the creating dialogue was opened
     * @param abort Flag if the dialogue is closed due to abort or as success close.
     */
    createClose(activeSession: Session, node: Node, abort:boolean = true): void {
        //console.trace();
        if (abort && node['schemaChildren'].length) {
            this.maintainLast(activeSession, node);
        }
        delete node['creatingChild'];
        delete node['schemaChildren'];
    }

    /**
     * Get free position number for the list instance. Taken as a successor of the
     * highest id of the sibling list instances.
     * @param parent Parent node where a new list instance will be inserted.
     * @param path Path of the list to identify instances of the specific list
     * @return free position for the new instance (starts by 1)
     */
    private list_nextpos(parent: Node, path: string): number {
        let search;
        if ('new' in parent) {
            search = parent['children'];
        } else {
            search = parent['newChildren'];
        }
        let pos = 1;
        if (search.length) {
            for (let sibling of search) {
                if (sibling['path'].substr(0, path.length + 1) == path + '[') {
                    let n = parseInt(sibling['path'].substring(path.length + 1));
                    if (n >= pos) {
                        pos = n + 1;
                    }
                }
            }
        }
        return pos;
    }

    /**
     * Generate correct name for the schema node (so prefixed if needed)
     * @param parent Schema node of the parent.
     * @param child Schema node of the node to be processed.
     */
    schemaName(parent: NodeSchema, node: NodeSchema): string {
        if (parent['module'] != node['module']) {
            return node['module'] + ':' + node['name'];
        } else {
            return node['name'];
        }
    }

    /**
     * Create new node in given parent. If the parent Node exists only in
     * frontend's data (created but not committed), the child is inserted into
     * the 'children' list and no new Modification record is created - the node
     * will be created as part of creating the parent's subtree. Otherwise, the
     * child is inserted in 'newChildren' list and new record is created. In
     * case of creating list, all its keys are also created.
     * @param activeSession Session to work with.
     * @param parent Parent node where a new child is supposed to be created.
     * @param index Index in the 'schemaChildren' list specifying which node is supposed to be created.
     */
    create(activeSession: Session, parent: Node, index: number): void {
        //console.trace();
        let newNode = {};
        newNode['new'] = true;
        newNode['info'] = parent['schemaChildren'][index];
        if (parent['path'] == '/') {
            newNode['path'] = '/' + this.schemaName(parent['info'], newNode['info']);
        } else {
            newNode['path'] = parent['path'] + '/' + this.schemaName(parent['info'], newNode['info']);
        }
        newNode['dirty'] = true;

        if ('new' in parent) {
            if (!('children' in parent)) {
                parent['children'] = [];
            }
            parent['children'].push(newNode);
        } else {
            if (!('newChildren' in parent)) {
                parent['newChildren'] = [];
            }
            parent['newChildren'].push(newNode);
        }

        switch(newNode['info']['type']) {
        case 1: /* container */
            parent['schemaChildren'].splice(index, 1);

            newNode['children'] = [];
            /* open creation dialog for nodes inside the created container */
            this.sessionsService.childrenSchemas(activeSession.key, newNode).subscribe(result => {
                this.createOpen(activeSession, result, newNode);
            });
            break;
        case 4: /* leaf */
            parent['schemaChildren'].splice(index, 1);

            if ('default' in newNode['info']) {
                newNode['value'] = newNode['info']['default'];
            }
            this.setEdit(activeSession, newNode, true);
            break;
        case 8: /* leaf-list */
            /* check number of instances, if first, mark this as the first leaf-list instance */
            newNode['first'] = true; /* make nodesToShow working */
            let siblings = this.treeService.nodesToShow(activeSession, newNode);
            if (siblings.length != 1) {
                delete newNode['first'];
            }
            if (newNode['info']['ordered']) {
                newNode['order'] = siblings.length - 1;
            }
            if (newNode['info']['ordered']) {
                let record = this.getModificationsRecord(activeSession, newNode['path']);
                if (record && ('reorder' in record)) {
                    record['reorder'].push(record['reorder'].length);
                }
            }

            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(parent, newNode['path']) + ']';
            this.setEdit(activeSession, newNode, true)
            break;
        case 16: /* list */
            if (newNode['info']['ordered']) {
                let siblings = this.treeService.nodesToShow(activeSession, newNode);
                newNode['order'] = siblings.length - 1;
            }
            if (newNode['info']['ordered']) {
                let record = this.getModificationsRecord(activeSession, newNode['path']);
                if (record && ('reorder' in record)) {
                    record['reorder'].push(record['reorder'].length);
                }
            }
            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(parent, newNode['path']) + ']';
            newNode['keys'] = [];
            for (let key of newNode['info']['keys']) {
                newNode['keys'].push("");
            }
            newNode['children'] = [];
            /* open creation dialog for nodes inside the created list */
            this.sessionsService.childrenSchemas(activeSession.key, newNode).subscribe(result => {
                if (result && result.length) {
                    this.createOpen(activeSession, result, newNode);
                }

                for (let key of newNode['info']['keys']) {
                    for (let i in newNode['schemaChildren']) {
                        if (newNode['schemaChildren'][i]['name'] == key && newNode['schemaChildren'][i]['module'] == newNode['info']['module']) {
                            let newKey = {};
                            newKey['new'] = true;
                            newKey['info'] = newNode['schemaChildren'][i];
                            newKey['path'] = newNode['path'] + '/' + this.schemaName(newNode['info'], newKey['info']);
                            newKey['dirty'] = true;
                            this.setEdit(activeSession, newKey, true)
                            newNode['children'].push(newKey)
                            newNode['schemaChildren'].splice(i, 1);
                            if (!newNode['schemaChildren'].length) {
                                newKey['last'] = true;
                                this.createClose(activeSession, newNode, false);
                            }
                        }
                    }
                }
            });

            break;
        }

        if (!parent['schemaChildren'].length) {
            newNode['last'] = true;
            this.createClose(activeSession, parent, false);
        }

        if (!('new' in parent)) {
            /* store the record about the newly created data */
            let record = this.createModificationsRecord(activeSession, newNode['path']);
            if (('type' in record) && record['type'] == ModificationType.Delete) {
                record['type'] = ModificationType.Replace;
                delete record['original']['deleted'];
                for (let i in parent['children']) {
                    if (parent['children'][i] == record['original']) {
                        parent['children'].splice(i, 1);
                        break;
                    }
                }
            } else {
                record['type'] = ModificationType.Create;
            }
            record['data'] = newNode;
        }
        //console.log(node)
    }

    /**
     * Cancel modification record connected with the given node.
     * @param activeSession Session to work with.
     * @param node Node element whose modification record will be removed.
     * @param recursion Flag to recursively process the node's subtree
     * @param reorder Boolean flag to remove also the reorder modification
     * connected with all the instances of the given node's schema node.
     * @param firstcall Flag for top level call to control recursion, do not
     * use outside the function itself
     */
    cancelModification(activeSession: Session, node: Node = activeSession.data,
                       recursion: boolean = true, reorder: boolean = true, firstcall: boolean = true): void {
        if ('creatingChild' in node) {
            delete node['creatingChild'];
        }
        if ('deleted' in node) {
            delete node['dirty'];
            delete node['deleted'];
        }

        let parent = this.treeService.nodeParent(activeSession, node);
        if ('new' in node) {
            if (node['info']['type'] == 1 || node['info']['type'] == 4) {
                /* fix the list of nodes to create in parent */
                let schemas;
                if (!('schemaChildren' in parent)) {
                    schemas = [];
                } else {
                    schemas = parent['schemaChildren'];
                }
                schemas.push(node['info']);
                this.createOpen(activeSession, schemas, parent)
            }

            /* removing newly created subtree */
            this.delete(activeSession, node);
        } else if (activeSession.modifications) {
            let record = this.getModificationsRecord(activeSession, node['path']);
            if (record) {
                delete node['dirty'];
                if (record['type'] == ModificationType.Change) {
                    node['value'] = record['original'];
                }
                this.removeModificationsRecord(activeSession, node['path']);
                if (!activeSession.modifications) {
                    return;
                }
            }
            if (reorder) {
                let path = this.treeService.pathCutPredicate(node['path']);
                let record = this.getModificationsRecord(activeSession, path);
                if (record) {
                    for (let item of this.treeService.getInstances(activeSession, node)) {
                        item['order'] = record['reorder'][item['order']];
                        delete item['last'];
                    }
                    this.removeModificationsRecord(activeSession, path);
                }
            }
        }

        /* recursion */
        if (recursion && 'children' in node) {
            if ('newChildren' in node) {
                for (let child of node['newChildren']) {
                    let record = this.getModificationsRecord(activeSession, child['path']);
                    if (record['type'] == ModificationType.Change) {
                        node['children'].push(record['original'])
                    }
                    this.removeModificationsRecord(activeSession, child['path']);
                    if (child['info']['ordered']) {
                        let path = this.treeService.pathCutPredicate(child['path']);
                        this.removeModificationsRecord(activeSession, path);
                    }
                }
                delete node['newChildren'];
            }
            for (let child of node['children']) {
                delete child['last'];
                delete child['moved'];
                this.cancelModification(activeSession, child, true, reorder, false);
                if (child['info']['ordered']) {
                    /* revert order change */
                    let path = this.treeService.pathCutPredicate(child['path']);
                    let record = this.getModificationsRecord(activeSession, path);
                    if (record) {
                        let nodes = this.treeService.nodesToShow(activeSession, child);
                        for (let i in nodes) {
                            nodes[i]['order'] = record['reorder'][i];
                        }
                        this.removeModificationsRecord(activeSession, path);
                    }
                }
            }
            this.maintainLast(activeSession, node);
        }
        if (firstcall) {
            this.maintainLast(activeSession, parent);
        }
    }

    /**
     * Check presence of the necessary keys in lists and update its predicate if safe.
     * @param node Root node where to start checking
     * @param top internal recursion flag, do not use
     * @return null in case of success, error message in case of error.
     */
    private resolveKeys(node: Node, top: boolean = true): string {
        if (node['info']['type'] == 16) {
            if (!('children' in node) || !node['children'].length) {
                return 'no key in ' + node['path'];
            }
            let count = node['info']['keys'].length;
            if (node['children'].length != count || !node['children'][count - 1]['info']['key']) {
                return 'invalid number (expected ' + count + ') of keys in ' + node['path'];
            }
        }

        /* recursion */
        if (node['info']['type'] == 16 || node['info']['type'] == 1) {
            for (let i in node['children']) {;
                if (node['children'][i]['info']['type'] == 4) {
                    /* leaf */
                    if (!('value' in node['children'][i])) {
                        if (node['children'][i]['info']['key']) {
                            return 'not confirmed value of the ' + node['children'][i]['path'] + ' key.';
                        }
                        console.log('not confirmed node ' + node['children'][i]['path'] + ', removing it');
                        node['children'].splice(i, 1);
                    }
                } else if (node['children'][i]['info']['type'] == 8) {
                    /* leaf-list */
                    if (!('value' in node['children'][i])) {
                        console.log('not confirmed node ' + node['children'][i]['path'] + ', removing it');
                        node['children'].splice(i, 1);
                    }
                } else {
                    /* recursion */
                    let msg = this.resolveKeys(node['children'][i], false);
                    if (msg) {
                        return msg;
                    }
                }
            }
        }

        /* update predicate in path */
        if (node['info']['type'] == 16 && top) {
            node['path'] = node['path'].slice(0, node['path'].lastIndexOf('['))
            for (let i in node['info']['keys']) {
                node['path'] = node['path'] + '[' + node['info']['keys'][i] + '=\'' + node['children'][i]['value'] + '\']'
            }
        } else if (node['info']['type'] == 8 && top) {
            node['path'] = node['path'].slice(0, node['path'].lastIndexOf('[') + 1) + '.=\'' + node['value'][0] + '\']'
        }
        return null;
    }

    /**
     * Find the position of the highest absolute distance of the moved nodes.
     * @param nodes Array of user-ordered lists or leaf-lists with counted
     * distance information
     * @return Index in the given array of a node with the highest absolute
     * distance value
     */
    private getHighestDistIndex(nodes: Node[]): number {
        let val = 0;
        let pos = -1;
        for (let i in nodes) {
            let x = Math.abs(nodes[i]['dist'])
            if (x > val) {
                val = x;
                pos = Number(i);
            }
        }
        return pos;
    }

    /**
     * Create complete list predicate with all its keys
     * @param list Node to process
     * @return Predicate string.
     */
    private listPredicates(list: Node): string {
        let result = "";
        for (let key of list['children']) {
            if (!('key' in key['info'])) {
                break;
            }
            result.concat('[' + this.treeService.moduleName(key) + ':' + key['info']['name'] + '=\'' + key['value'] + '\']');
        }
        return result;
    }

    /**
     * Apply all the modification records of the given session by sending them to the backend.
     * @param activeSession Session whose Modification records will be applied
     * @return Received backend's result message
     */
    applyModification(activeSession: Session) {
        for (let mod in activeSession.modifications) {
            //console.log(JSON.stringify(mod));
            if (!('data' in activeSession.modifications[mod])) {
                continue;
            }
            /* remove not confirmed leaf/leaf-lists */
            if (activeSession.modifications[mod]['data']['info']['type'] == 4 || activeSession.modifications[mod]['data']['info']['type'] == 8) {
                if (!('value' in activeSession.modifications[mod]['data'])) {
                    console.log('not confirmed node ' + activeSession.modifications[mod]['data']['path'] + ', removing it');
                    this.cancelModification(activeSession, mod['data'], false, false);
                }
            }
            /* remove deleted nodes from the reorder data */
            if (activeSession.modifications[mod]['data']['info']['ordered'] && activeSession.modifications[mod]['type'] == ModificationType.Delete) {
                let record = this.getModificationsRecord(activeSession, this.treeService.pathCutPredicate(activeSession.modifications[mod]['data']['path']));
                if (record) {
                    record['reorder'].splice(activeSession.modifications[mod]['data']['order'], 1);
                }
            }
            let err = this.resolveKeys(activeSession.modifications[mod]['data']);
            if (err) {
                console.log(err);
                return of({'success': false, 'error': [{'message': err}]});
            }
        }

        /* transform reorder records to move transactions */
        for (let mod in activeSession.modifications) {
            if (activeSession.modifications[mod]['type'] != ModificationType.Reorder) {
                continue;
            }
            let record = activeSession.modifications[mod];
            let node = this.treeService.pathNode(activeSession, mod);
            let nodes = this.treeService.nodesToShow(activeSession, node);
            /* prepare distances of the moved nodes */
            for (let i in nodes) {
                /* nodes are ordered, but contains also deleted nodes */
                if ('deleted' in nodes[i]) {
                    nodes.splice(Number(i), 1);
                    continue;
                }
                let pos_new = nodes[i]['order'];
                let pos_orig = record['reorder'][pos_new];
                nodes[i]['dist'] = pos_new - pos_orig;
            }
            /* eat distances to generate transactions */
            record['transactions'] = [];
            let pos = this.getHighestDistIndex(nodes);
            while (pos != -1) {
                if (nodes[pos]['dist'] < 0) {
                    /* moved to the left */
                    let offset = 1;
                    for (; nodes[pos]['dist'] != 0; nodes[pos]['dist']++, offset++) {
                        nodes[pos + offset]['dist']--;
                    }
                    offset--;
                    let transaction = {};
                    transaction['node'] = nodes[pos]['path'];
                    if (pos == 0) {
                        //console.log("moving " + nodes[pos]['path'] + " first")
                        transaction['insert'] = 'first';
                    } else {
                        //console.log("moving " + nodes[pos]['path'] + " before " + nodes[pos + 1]['path'])
                        transaction['insert'] = 'before';
                        if (nodes[pos + 1]['info']['type'] == 8) {
                            transaction['value'] = nodes[pos + 1]['value'];
                        } else { /* 16 - list */
                            transaction['key'] = this.listPredicates(nodes[pos + 1]);
                        }
                    }
                    record['transactions'].splice(0, 0, transaction);
                    let move = nodes[pos];
                    nodes.splice(pos, 1);
                    nodes.splice(pos + offset, 0, move);
                } else {
                    /* moved to the right */
                    let offset = 1
                    for (; nodes[pos]['dist'] != 0; nodes[pos]['dist']--, offset++) {
                        nodes[pos - offset]['dist']++;
                    }
                    offset--;
                    let transaction = {};
                    transaction['node'] = nodes[pos]['path'];
                    if (pos == nodes.length - 1) {
                        //console.log("moving " + nodes[pos]['path'] + " last")
                        transaction['insert'] = 'last';
                    } else {
                        //console.log("moving " + nodes[pos]['path'] + " after " + nodes[pos - 1]['path'])
                        transaction['insert'] = 'after';
                        if (nodes[pos - 1]['info']['type'] == 8) {
                            transaction['value'] = nodes[pos - 1]['value'];
                        } else { /* 16 - list */
                            transaction['key'] = this.listPredicates(nodes[pos - 1]);
                        }
                    }
                    record['transactions'].splice(0, 0, transaction)
                    let move = nodes[pos];
                    nodes.splice(pos, 1);
                    nodes.splice(pos - offset, 0, move);
                }
                pos = this.getHighestDistIndex(nodes);
            }
            for (let item of nodes) {
                delete item['dist'];
            }
        }

        //console.log(JSON.stringify(activeSession.modifications));
        return this.sessionsService.commit(activeSession).pipe(
            tap(result => {
                if (result['success']) {
                    delete activeSession.modifications;
                } else {
                    console.log(result);
                }
                return result;
            })
        )
    }
}
