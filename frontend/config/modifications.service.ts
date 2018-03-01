import { Injectable } from '@angular/core';

import { Session} from './session';
import { SessionsService } from './sessions.service';
import { TreeService } from './tree.service';

@Injectable()
export class ModificationsService {

    constructor(private sessionsService: SessionsService, private treeService: TreeService) {}

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

    isDeleted(node): boolean {
        if ('deleted' in node) {
            return node['deleted'];
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
            console.log(children)
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

    createClose(activeSession, node, reason='abort') {
        //console.trace();
        if (reason == 'abort' && node['schemaChildren'].length) {
            let children = this.treeService.childrenToShow(node);
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
            node['children'].push(newNode)
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
            /* find the first instance, if not, mark this as the first leaf-list instance */
            for (let sibling of this.treeService.childrenToShow(node)) {
                if (sibling == newNode) {
                    newNode['first'] = true;
                    break;
                }
                if (sibling['info']['name'] == newNode['info']['name'] && sibling['info']['module'] == newNode['info']['module']) {
                    break;
                }
            }
            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(node, newNode['path']) + ']';
            this.setEdit(activeSession, newNode, true)
            console.log(newNode);
            break;
        case 16: /* list */
            newNode['path'] = newNode['path'] + '[' + this.list_nextpos(node, newNode['path']) + ']';
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
                            console.log(JSON.stringify(newNode));
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
        console.log(node)
    }

    cancelModification(activeSession, node = activeSession.data, recursion = true) {
        if ('creatingChild' in node) {
            delete node['creatingChild'];
        }
        if ('deleted' in node) {
            delete node['dirty'];
            delete node['deleted'];
        }

        if ('new' in node) {
            /* removing newly created subtree */
            let parent = this.treeService.nodeParent(activeSession, node);
            if ('new' in parent) {
                /* removing just a subtree of the created tree */
                for (let i in parent['children']) {
                    if (parent['children'][i] == node) {
                        if (Number(i) > 0 && parent['children'][i]['last']) {
                            parent['children'][Number(i) - 1]['last'] = true;
                        }
                        parent['children'].splice(i, 1);
                        break;
                    }
                }
            } else {
                this.removeModificationsRecord(activeSession, node['path']);
                for (let i in parent['newChildren']) {
                    if (parent['newChildren'][i]['path'] == node['path']) {
                        if (Number(i) > 0 && parent['newChildren'][i]['last']) {
                            parent['newChildren'][Number(i) - 1]['last'] = true;
                        }
                        parent['newChildren'].splice(i, 1);
                        break;
                    }
                }
                if (!parent['newChildren'].length) {
                    delete parent['newChildren'];
                }
            }

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
        } else if (activeSession.modifications) {
            let record = this.getModificationsRecord(activeSession, node['path']);
            if (record) {
                node['dirty'] = false;
                if (record['type'] == 'change') {
                    node['value'] = record['original'];
                }
                this.removeModificationsRecord(activeSession, node['path']);
                if (!activeSession.modifications) {
                    return;
                }
            }
        }

        /* recursion */
        if (recursion && 'children' in node) {
            if ('newChildren' in node) {
                for (let child of node['newChildren']) {
                    let record = this.getModificationsRecord(activeSession, child['path']);
                    if (record['type'] == 'change') {
                        if (node['children'].length) {
                            node['children'][node['children'].length - 1]['last'] = false;
                        }
                        record['original']['last'] = true;
                        node['children'].push(record['original'])
                    }
                    this.removeModificationsRecord(activeSession, child['path']);
                }
                delete node['newChildren'];
                if (('children' in node) && node['children'].length) {
                    node['children'][node['children'].length - 1]['last'] = true;
                }
            }
            let last;
            for (let child of node['children']) {
                this.cancelModification(activeSession, child);
                delete child['last'];
                last = child;
            }
            last['last'] = true;
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

    applyModification(activeSession: Session) {
        for (let mod in activeSession.modifications) {
            //console.log(JSON.stringify(mod));
            if (!('data' in activeSession.modifications[mod])) {
                continue;
            } else if (activeSession.modifications[mod]['data']['info']['type'] == 4 || activeSession.modifications[mod]['data']['info']['type'] == 8) {
                /* remove not confirmed leaf/leaf-lists */
                if (!('value' in activeSession.modifications[mod]['data'])) {
                    console.log('not confirmed node ' + activeSession.modifications[mod]['data']['path'] + ', removing it');
                    this.removeModificationsRecord(activeSession, mod);
                }
            }
            let err = this.resolveKeys(activeSession.modifications[mod]['data']);
            if (err) {
                console.log(err);
                return new Promise((resolve, reject) => {resolve({'success':false,'error': [{'message':err}]})});
            }
        }
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
