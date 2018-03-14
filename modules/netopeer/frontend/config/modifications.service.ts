import { Injectable } from '@angular/core';
import {Router} from '@angular/router';

import { Session} from './session';
import { SessionsService } from './sessions.service';
import { TreeService } from './tree.service';

@Injectable()
export class ModificationsService {

    constructor(private sessionsService: SessionsService,
                private treeService: TreeService,
                private router: Router) {}

    createModificationsRecord(activeSession, path) {
        if (!activeSession.modifications) {
            activeSession.modifications = {};
        }

        if (!(path in activeSession.modifications)) {
            activeSession.modifications[path] = {};
        }
        return activeSession.modifications[path];
    }

    getModificationsRecord(activeSession, path) {
        if (!activeSession.modifications) {
            return null;
        }

        if (!(path in activeSession.modifications)) {
            return null;
        }
        return activeSession.modifications[path];
    }

    removeModificationsRecord(activeSession, path = null) {
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

    renameModificationsRecord(activeSession, oldPath, newPath) {
        let record = this.getModificationsRecord(activeSession, oldPath);
        if (record) {
            activeSession.modifications[newPath] = record;
            delete activeSession.modifications[oldPath];
        }
    }

    setEdit(activeSession, node, set = true) {
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
                this.sessionsService.schemaValues(activeSession.key, node['info']['path']).then(result => {
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
        }
        if (!waiting) {
            node['edit'] = set;
        }
    }

    setLast(list) {
        let last;
        for (let iter of list) {
            delete iter['last'];
            last = iter;
        }
        last['last'] = true;
    }

    schemaName(parent, child):string {
        if (parent['module'] != child['module']) {
            return child['module'] + ':' + child['name'];
        } else {
            return child['name'];
        }
    }

    isDeleted(node, value = false): boolean {
        if ('deleted' in node) {
            return node['deleted'];
        } else if (!value && node['info']['type'] == 8 && node['first']) {
            for (let item of this.treeService.nodesToShow(this.sessionsService.getActiveSession(), node)) {
                if (item['deleted']) {
                    return true;
                }
            }
        }
        return false;
    }

    isMoved(activeSession: Session, node): boolean {
       let path = this.treeService.pathCutPredicate(node['path']);
       if (this.getModificationsRecord(activeSession, path)) {
            return true;
        }
        return false;
    }

    private deleteChild(activeSession, parent, childArray, node) {
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

    delete(activeSession, node) {
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
                record['type'] = 'delete';
                record['original'] = node;
                node['dirty'] = true;
            } else if (record['type'] == 'change') {
                record['type'] = 'delete';
                node['value'] = record['original'];
                delete record['original'];
                delete record['value'];
            }
        }
    }

    change(activeSession, node, leafValue) {
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
                record['type'] = 'change';
                record['original'] = node['value'];
                record['value'] = leafValue;
                node['dirty'] = true;
            } else if (record['type'] == 'change' && record['original'] == leafValue) {
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

    createOpen(activeSession, schemas, node) {
        //console.trace();
        node['schemaChildren'] = schemas;
        node['creatingChild'] = {};

        if (schemas.length) {
            let children = this.treeService.childrenToShow(node);
            if (children.length) {
                let last = children[children.length - 1];
                if (last['info']['type'] == 16) {
                    let instances = this.treeService.getInstances(activeSession, last)
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

    private maintainLast(activeSession, parent) {
        if ('schemaChildren' in parent) {
            return;
        }
        let children = this.treeService.childrenToShow(parent);
        if (children.length) {
            let last = children[children.length - 1];
            if (last['info']['type'] == 16) {
                let instances = this.treeService.getInstances(activeSession, last)
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

    createClose(activeSession, node, reason='abort') {
        //console.trace();
        if (reason == 'abort' && node['schemaChildren'].length) {
            this.maintainLast(activeSession, node);
        }
        delete node['creatingChild'];
        delete node['schemaChildren'];
    }

    private list_nextpos(node, path: string): number {
        let search;
        if ('new' in node) {
            search = node['children'];
        } else {
            search = node['newChildren'];
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

    create(activeSession, node, index) {
        //console.trace();
        let newNode = {};
        newNode['new'] = true;
        newNode['info'] = node['schemaChildren'][index];
        if (node['path'] == '/') {
            newNode['path'] = '/' + this.schemaName(node['info'], newNode['info']);
        } else {
            newNode['path'] = node['path'] + '/' + this.schemaName(node['info'], newNode['info']);
        }
        newNode['dirty'] = true;

        if ('new' in node) {
            if (!('children' in node)) {
                node['children'] = [];
            }
            node['children'].push(newNode);
        } else {
            if (!('newChildren' in node)) {
                node['newChildren'] = [];
            }
            node['newChildren'].push(newNode);
        }

        switch(newNode['info']['type']) {
        case 1: /* container */
            node['schemaChildren'].splice(index, 1);

            newNode['children'] = [];
            /* open creation dialog for nodes inside the created container */
            this.sessionsService.childrenSchemas(activeSession.key, newNode['info']['path'], newNode).then(result => {
                this.createOpen(activeSession, result, newNode);
            });
            break;
        case 4: /* leaf */
            node['schemaChildren'].splice(index, 1);

            if ('default' in newNode['info']) {
                newNode['value'] = newNode['info']['default'];
            }
            this.setEdit(activeSession, newNode, true)
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

            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(node, newNode['path']) + ']';
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
            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(node, newNode['path']) + ']';
            newNode['keys'] = [];
            for (let key of newNode['info']['keys']) {
                newNode['keys'].push("");
            }
            newNode['children'] = [];
            /* open creation dialog for nodes inside the created list */
            this.sessionsService.childrenSchemas(activeSession.key, newNode['info']['path'], newNode).then(result => {
                if (result && result.length) {
                    this.createOpen(activeSession, result, newNode);
                }

                if (newNode['schemaChildren'].length) {
                    for (let i in newNode['schemaChildren']) {
                        if (!newNode['schemaChildren'][i]['key']) {
                            continue;
                        }
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
                            this.createClose(activeSession, newNode, 'success');
                        }
                    }
                }
            });

            break;
        }

        if (!node['schemaChildren'].length) {
            newNode['last'] = true;
            this.createClose(activeSession, node, 'success');
        }

        if (!('new' in node)) {
            /* store the record about the newly created data */
            let record = this.createModificationsRecord(activeSession, newNode['path']);
            if (('type' in record) && record['type'] == 'delete') {
                record['type'] = 'replace';
                delete record['original']['deleted'];
                for (let i in node['children']) {
                    if (node['children'][i] == record['original']) {
                        node['children'].splice(i, 1);
                        break;
                    }
                }
            } else {
                record['type'] = 'create';
            }
            record['data'] = newNode;
        }
        //console.log(node)
    }

    cancelModification(activeSession, node = activeSession.data, recursion = true, firstcall = true, reorder = true) {
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
                if (record['type'] == 'change') {
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
                    if (record['type'] == 'change') {
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
                this.cancelModification(activeSession, child, true, false);
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

    private sortKeys(list) {
        let key_index = 0;
        for (let key of list['info']['keys']) {
            for (let i in list['children']) {
                if (list['children'][i]['info']['name'] == key && list['children'][i]['info']['module'] == list['info']['module']) {
                    let moved = list['children'].splice(i, 1);
                    list['children'].splice(key_index++, 0, moved[0]);
                }
            }
        }
        return key_index;
    }

    private resolveKeys(node, top = true): string {
        if (node['info']['type'] == 16) {
            if (!('children' in node) || !node['children'].length) {
                return 'no key in ' + node['path'];
            }
            let count = this.sortKeys(node);
            if (count != node['info']['keys'].length) {
                return 'invalid number (' + count + ') of keys in ' + node['path'];
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

    private getHighestDistIndex(nodes) {
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

    private listPredicates(list) {
        let result = "";
        for (let key of list['children']) {
            if (!('key' in key['info'])) {
                break;
            }
            result.concat('[' + this.treeService.moduleName(key) + ':' + key['info']['name'] + '=\'' + key['value'] + '\']')
        }
    }

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
                    this.cancelModification(activeSession, mod['data'], false);
                }
            }
            /* remove deleted nodes from the reorder data */
            if (activeSession.modifications[mod]['data']['info']['ordered'] && activeSession.modifications[mod]['type'] == 'delete') {
                let record = this.getModificationsRecord(activeSession, this.treeService.pathCutPredicate(activeSession.modifications[mod]['data']['path']));
                if (record) {
                    record['reorder'].splice(activeSession.modifications[mod]['data']['order'], 1);
                }
            }
            let err = this.resolveKeys(activeSession.modifications[mod]['data']);
            if (err) {
                console.log(err);
                return new Promise((resolve, reject) => {resolve({'success':false,'error': [{'message':err}]})});
            }
        }

        /* transform reorder records to move transactions */
        for (let mod in activeSession.modifications) {
            if (activeSession.modifications[mod]['type'] != 'reorder') {
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
            while(pos != -1) {
                if (nodes[pos]['dist'] < 0) {
                    /* moved to the left */
                    let offset = 1
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
        return this.sessionsService.commit(activeSession.key).then(result => {
            if (result['success']) {
                delete activeSession.modifications;
            } else {
                console.log(result);
            }
            return result;
        })
    }
}
