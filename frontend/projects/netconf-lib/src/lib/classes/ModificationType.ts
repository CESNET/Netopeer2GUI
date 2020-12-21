/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 *
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

