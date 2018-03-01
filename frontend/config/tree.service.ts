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

    nodeParent(activeSession: Session, node) {
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

    childrenToShow(node) {
        let result = [];
        let nc_dup = [];
        if ('newChildren' in node) {
            nc_dup = node['newChildren'].slice();
        }
        if ('children' in node) {
            let lastList = null;
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
            result = result.concat(nc_dup);
        }
        return result;
    }

    getInstances(activeSession, node, result = []) {
        let parent = this.nodeParent(activeSession, node);
        if ('children' in parent) {
            for (let child of parent['children']) {
                if (node['info']['name'] == child['info']['name'] && node['info']['module'] == child['info']['module']) {
                    result.push(child);
                }
            }
        }
        if ('newChildren' in parent) {
            for (let child of parent['newChildren']) {
                if (node['info']['name'] == child['info']['name'] && node['info']['module'] == child['info']['module']) {
                    result.push(child);
                }
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
}
