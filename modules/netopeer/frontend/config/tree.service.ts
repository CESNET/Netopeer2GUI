import {Injectable} from '@angular/core';

import {Session} from './session';

@Injectable()
export class TreeService {

    constructor() {}

    expandable(node): boolean {
        if (node['info']['type'] == 1 || /* container */
            node['info']['type'] == 16) { /* list */
                return true;
        }
        return false;
    }

    pathNode(activeSession: Session, path: string, type: string = 'node') {
        let node = null
        let parent = null;
        let children = activeSession.data['children'];
        let newChildren = activeSession.data['newChildren'];

        if (path == '/') {
            node = activeSession.data;
            return;
        }

        let match = false;
        while (children || newChildren) {
            match = false;

            if (children) {
                for (let iter of children) {
                    let pathCompare;
                    if (path[path.length - 1] == ']') {
                        /* compare with predicate */
                        pathCompare = iter['path'];
                    } else {
                        /* ignore predicate, so in case of list/leaflist specified
                         * without predicate, return the first instance */
                        pathCompare = this.pathCutPredicate(iter['path']);
                    }
                    if (path == pathCompare) {
                        node = iter;
                        match = true;
                        children = null;
                        newChildren = null;
                        break;
                    } else if (path.startsWith(iter['path'] + '/')) {
                        match = true;
                        parent = iter;
                        children = iter['children'];
                        if ('newChildren' in iter) {
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
                    let pathCompare;
                    if (path[path.length - 1] == ']') {
                        /* compare with predicate */
                        pathCompare = iter['path'];
                    } else {
                        /* ignore predicate, so in case of list/leaflist specified
                         * without predicate, return the first instance */
                        pathCompare = this.pathCutPredicate(iter['path']);
                    }
                    if (path == pathCompare) {
                        node = iter;
                        match = true;
                        children = null;
                        newChildren = null;
                        break;
                    } else if (path.startsWith(iter['path'] + '/')) {
                        match = true;
                        parent = iter;
                        children = iter['children'];
                        if ('newChildren' in iter) {
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

        if (type == 'parent') {
            return parent;
        } else {
            return node;
        }
    }

    nodeParent(activeSession: Session, node) {
        let parent = this.pathNode(activeSession, node['path'], 'parent')
        if (!parent) {
            parent = activeSession.data;
        }
        return parent;
    }

    inheritIndentation(indentation, node) {
        let newIndent;
        if (node['last'] || ('lastLeafList' in node)) {
            newIndent = [true];
        } else {
            newIndent = [false];
        }

        if (!indentation) {
            return newIndent;
        } else {
            return indentation.concat(newIndent);
        }
    }

    private minOrder(list, startIndex: number): number {
        let result: number = list[startIndex]['order'];
        for (let i = startIndex + 1; i < list.length; i++) {
            if (list[i]['info']['name'] != list[startIndex]['info']['name'] || list[i]['info']['module'] != list[startIndex]['info']['module']) {
                continue;
            }
            if (list[i]['order'] < result) {
                result = list[i]['order'];
            }
        }
        return result;
    }

    sortInstances(list, startFromZero = true) {
        let processed = [];
        for (let l in list) {
            if (!list[l]['info']['ordered'] || (list[l]['info']['module']+':'+list[l]['info']['name'] in processed)) {
                continue;
            }
            let id = list[l]['info']['module']+':'+list[l]['info']['name'];
            processed.push(id)
            let index;
            if (startFromZero) {
                index = 0;
            } else {
                index = this.minOrder(list, Number(l));
            }
            for (let i = Number(l); i < list.length; i++) {
                if (id != list[i]['info']['module']+':'+list[i]['info']['name']) {
                    continue;
                }
                if (list[i]['order'] != index) {
                    for (let j = Number(i) + 1; j < list.length; j++) {
                        if (list[j]['order'] == index && id == list[j]['info']['module']+':'+list[j]['info']['name']) {
                            let move = list[j];
                            console.log('moving ' + list[i]['path'])
                            console.log('moving ' + move['path'])
                            if (move['last']) {
                                delete move['last'];
                                list[i]['last'] = true;
                            }
                            if (move['lastLeafList'] && !('lastLeafList' in list[i])) {
                                delete move['lastLeafList'];
                                list[i]['lastLeafList'] = true;
                            }
                            if (list[i]['last']) {
                                delete list[i]['last'];
                                move['last'] = true;
                            }
                            if (list[i]['first']) {
                                list[i]['first'] = false;
                                move['first'] = true;
                            }
                            list.splice(j, 1, list[i]);
                            list.splice(i, 1, move);
                        }
                    }
                }
                index++;
            }
        }
    }

    childrenToShow(node) {
        let result = [];
        let nc_dup = [];
        if ('newChildren' in node) {
            nc_dup = node['newChildren'].slice();
        }
        if ('children' in node) {
            let lastList = null;
            if ('new' in node) {
                /* sort lists/leaf-lists in newly created containers/lists */
                this.sortInstances(node['children']);
            }
            for (let child of node['children']) {
                if (lastList) {
                    if (lastList['name'] == child['info']['name'] && lastList['module'] == child['info']['module']) {
                        continue;
                    } else {
                        lastList = null;
                    }
                }
                if (child['info']['type'] == 16 || child['info']['type'] == 8) {
                    lastList = child['info'];
                    for (let i = nc_dup.length - 1; i >= 0; i--) {
                        if (lastList['name'] == nc_dup[i]['info']['name'] && lastList['module'] == nc_dup[i]['info']['module']) {
                            nc_dup.splice(Number(i), 1);
                        }
                    }
                }
                result.push(child);
            }
        }
        if (nc_dup.length) {
            let lastList = null;
            for (let child of nc_dup) {
                if (lastList) {
                    if (lastList['name'] == child['info']['name'] && lastList['module'] == child['info']['module']) {
                        continue;
                    } else {
                        lastList = null;
                    }
                }
                if (child['info']['type'] == 16 || child['info']['type'] == 8) {
                    lastList = child['info'];
                }
                result.push(child);
            }
        }
        if (node['path'] == '/test:test') {console.log(result)}
        return result;
    }

    private getInstancesInsert(node, child, result) {
        if (node['info']['name'] == child['info']['name'] && node['info']['module'] == child['info']['module']) {
            if ('order' in child) {
                for (let i in result) {
                    if (result[i]['order'] > child['order']) {
                        result.splice(Number(i), 0, child);
                        return Number(i);
                    }
                }
            }
            result.push(child);
        }
    }

    getInstances(activeSession, node, result = []) {
        let parent = this.nodeParent(activeSession, node);
        if ('children' in parent) {
            for (let child of parent['children']) {
                this.getInstancesInsert(node, child, result);
            }
        }
        if ('newChildren' in parent) {
            for (let child of parent['newChildren']) {
                this.getInstancesInsert(node, child, result);
            }
        }
        return result;
    }

    nodesToShow(activeSession, node) {
        let result = [];
        if (node['info']['type'] == 16) {
            this.getInstances(activeSession, node, result);
        } else if (node['info']['type'] == 8) {
            if (node['first']) {
                this.getInstances(activeSession, node, result);
            }
        } else {
            result.push(node);
        }
        return result;
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

    updateHiddenFlags(activeSession) {
        let mixed = false;
        let rootsonly = true;
        for (let root of activeSession.data['children']) {
            if (this.hasHiddenChild(root, true)) {
                mixed = true;
            } else {
                rootsonly = false;
            }
        }
        if (mixed) {
            if (rootsonly) {
                activeSession.dataVisibility = 'root';
            } else {
                activeSession.dataVisibility = 'mixed';
            }
        }
    }

    pathCutPredicate(path: string) {
        if (path[path.length - 1] == ']') {
            return path.slice(0, path.lastIndexOf('['))
        } else {
            path = path;
        }
        return path;
    }

    moduleName(node): string {
        let at = node['info']['module'].indexOf('@');
        if (at == -1) {
            return node['info']['module'];
        } else {
            return node['info']['module'].substring(0, at);
        }
    }
}
