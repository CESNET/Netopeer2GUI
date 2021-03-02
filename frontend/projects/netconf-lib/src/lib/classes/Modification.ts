/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A single modification
 */
import {ModificationType} from './ModificationType';

export class Modification {
  [path: string]: {
    type: ModificationType;
    original: any; // Original value before modification
    value: any; // A new value
    data: object; // The node data
  }
}
