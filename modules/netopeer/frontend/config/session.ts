import { Device } from '../inventory/device';

import { SessionsService } from './sessions.service';

export enum NodeType {
    container = 1,
    leaf = 4,
    leaflist = 8,
    list = 16
}

export class Session {
  constructor (
    public key: string,
    public device: Device,
    public loading = false,
    public data: Node = null,
    public treeFilters = [],
    public modifications = null,
    public cpblts: string = "",
    public dataPresence: string = 'none',
    public statusVisibility: boolean = true,
    public cpbltsVisibility: boolean = false,
  ) {}
}

export class NodeSchema {
/*
 * type: NodeType;
 * path: string;
 */
}

export class Node {
/*
 * path: string;
 * info: NodeSchema;
 * 
 * === container ===
 * children: Node[]
 * newChildren: Node[]
 * 
 * === leaf ===
 * value: string;
 * 
 * === leaf-list ===
 * value: string;
 * 
 * === list ===
 * children: Node[]
 * newChildren: Node[]
 */
}
