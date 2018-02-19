import { Injectable } from '@angular/core';

import { Session} from './session';
import { SessionsService } from './sessions.service';

@Injectable()
export class ModificationsService {

    constructor(private sessionsService: SessionsService) {}

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

    setDirty(activeSession, node) {
        if (!activeSession.modifications) {
            return;
        }

        if (node['path'] in activeSession.modifications) {
            node['dirty'] = true;
            if (activeSession.modifications[node['path']]['type'] == 'change') {
                activeSession.modifications[node['path']]['original'] = node['value'];
            }
            node['value'] = activeSession.modifications[node['path']]['value']; 
        }
        /* recursion */
        if ('children' in node) {
            for (let child of node['children']) {
                this.setDirty(activeSession, child);
            }
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

    nodeParent(activeSession, node) {
        if (node['path'] =='/') {
            return null;
        }

        let match = false;
        let parent = null;
        let children = activeSession.data['children'];
        let newChildren = activeSession.data['newChildren'];

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
            parent = activeSession.data;
        }
        return parent;
    }

    schemaName(parent, child):string {
        if (parent['module'] != child['module']) {
            return child['module'] + ':' + child['name'];
        } else {
            return child['name'];
        }
    }

    delete(activeSession, node) {
        if ('new' in node) {
            /* removing newly created subtree */
            let parent = this.nodeParent(activeSession, node);
            if ('new' in parent) {
                /* removing just a subtree of the created tree */
                for (let i in parent['children']) {
                    if (parent['children'][i] == node) {
                        parent['children'].splice(i, 1);
                        break;
                    }
                }
            } else {
                this.removeModificationsRecord(activeSession, node['path']);
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
            let record = this.createModificationsRecord(activeSession, node['path']);

            if (!('type' in record)) {
                /* new record */
                record['type'] = 'delete';
                record['original'] = node;
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
    }

    change(activeSession, node, leafValue) {
        if (!('new' in node)) {
            let record = this.createModificationsRecord(activeSession, node['path']);
            if (!('type' in record)) {
                console.log(record);
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
                console.log(record);
                /* change back to the original value, remove the change record */
                this.removeModificationsRecord(activeSession, node['path']);
                node['dirty'] = false;
            } else {
                console.log(record);
                /* another change of existing change record */
                record['value'] = leafValue;
                node['dirty'] = true;
            }
        }

        node['value'] = leafValue;
        this.setEdit(activeSession, node, false);
    }

    createOpen(schemas, node) {
        //console.trace();
        node['schemaChildren'] = schemas;
        node['creatingChild'] = {};

        if (schemas.length) {
            if (('newChildren' in node) && node['newChildren'].length) {
                delete node['newChildren'][node['newChildren'].length - 1]['last']
            } else if (('children' in node) && node['children'].length) {
                delete node['children'][node['children'].length - 1]['last'];
            }
        }
    }

    createClose(node, reason='abort') {
        //console.trace();
        if (reason == 'abort' && node['schemaChildren'].length) {
            if (('newChildren' in node) && node['newChildren'].length) {
                node['newChildren'][node['newChildren'].length - 1]['last'] = true;
            } else if (('children' in node) && node['children'].length) {
                node['children'][node['children'].length - 1]['last'] = true;
            }
        }
        delete node['creatingChild'];
        delete node['schemaChildren'];
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
        case 1: /* container */
            node['schemaChildren'].splice(index, 1);

            newNode['children'] = [];
            /* open creation dialog for nodes inside the created container */
            this.sessionsService.childrenSchemas(activeSession.key, newNode['info']['path'], newNode).then(result => {
                this.createOpen(result, newNode);
            });
            break;
        case 4: /* leaf */
            node['schemaChildren'].splice(index, 1);

            if ('default' in newNode['info']) {
                newNode['value'] = newNode['info']['default'];
            }
            this.setEdit(activeSession, newNode, true)
            break;
        case 16: /* list */
            let search;
            if ('new' in node) {
                search = node['children'];
            } else {
                search = node['newChildren'];
            }
            let pos = 1;
            if (search.length) {
                for (let sibling of search) {
                    if (sibling['path'].substr(0, newNode['path'].length + 1) == newNode['path'] + '[') {
                        let n = parseInt(sibling['path'].substring(newNode['path'].length + 1));
                        if (n >= pos) {
                            pos = n + 1;
                        }
                    }
                }
            }
            newNode['path'] = newNode['path'] + '[' + pos + ']';

            newNode['children'] = [];
            /* open creation dialog for nodes inside the created list */
            this.sessionsService.childrenSchemas(activeSession.key, newNode['info']['path'], newNode).then(result => {
                if (result && result.length) {
                    this.createOpen(result, newNode);
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
                            this.createClose(newNode, 'success');
                        }
                    }
                }
            });

            break;
        }

        if (!node['schemaChildren'].length) {
            newNode['last'] = true;
            this.createClose(node, 'success');
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
            node['dirty'] = false;
            node['deleted'] = false;
        }

        if ('new' in node) {
            /* removing newly created subtree */
            let parent = this.nodeParent(activeSession, node);
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
                this.createOpen(schemas, parent)
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
        if (node['info']['type'] == 16 || node['info']['type'] == 1) {
            for (let i in node['children']) {;
                console.log(node['children'][i]);
                if (node['children'][i]['info']['type'] == 4) {
                    /* leaf */
                    if (!('value' in node['children'][i])) {
                        if (node['children'][i]['info']['key']) {
                            return 'not confirmed value of the ' + node['children'][i]['path'] + ' key.';
                        }
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
        }
        return null;
    }

    applyModification(activeSession: Session) {
        for (let mod in activeSession.modifications) {
            //console.log(JSON.stringify(mod));
            if (!('data' in activeSession.modifications[mod])) {
                continue;
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
