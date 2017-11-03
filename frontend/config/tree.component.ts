import {Component, Input, OnInit} from '@angular/core';

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
    objectKeys = Object.keys;
    constructor(private sessionsService: SessionsService) {}

    ngOnInit(): void {
        this.activeSession = this.sessionsService.getActiveSession(this.sessionsService.activeSession);
    }

    getSubtree(node, all: boolean) {
        this.sessionsService.rpcGetSubtree(this.activeSession.key, all, node['path']).subscribe(result => {
            if (result['success']) {
                node['children'] = result['data']['children'];
                for (let iter of this.activeSession.data) {
                    this.hasHiddenChild(iter, true);
                }
            }
        });
    }

    getType(object) {
        let result = 'data';
        if (typeof object == 'object') {
            if (object instanceof Array) {
                result = 'array';
            } else {
                result = 'object';
            }
        }
        return result;
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

    collapse(node) {
        delete node['children'];
        this.activeSession.dataVisibility = 'mixed';
        for (let iter of this.activeSession.data) {
            this.hasHiddenChild(iter, true);
        }
    }
}
