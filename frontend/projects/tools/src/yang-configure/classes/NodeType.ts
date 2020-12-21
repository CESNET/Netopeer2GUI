/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Node types from the libyang library
 */
export enum NodeType {
  LYS_UNKNOWN = 0x0000,        /**< uninitialized unknown statement node */
  LYS_CONTAINER = 0x0001,      /**< container statement node */
  LYS_CHOICE = 0x0002,         /**< choice statement node */
  LYS_LEAF = 0x0004,           /**< leaf statement node */
  LYS_LEAFLIST = 0x0008,       /**< leaf-list statement node */
  LYS_LIST = 0x0010,           /**< list statement node */
  LYS_ANYXML = 0x0020,         /**< anyxml statement node */
  LYS_CASE = 0x0040,           /**< case statement node */
  LYS_NOTIF = 0x0080,          /**< notification statement node */
  LYS_RPC = 0x0100,            /**< rpc statement node */
  LYS_INPUT = 0x0200,          /**< input statement node */
  LYS_OUTPUT = 0x0400,         /**< output statement node */
  LYS_GROUPING = 0x0800,       /**< grouping statement node */
  LYS_USES = 0x1000,           /**< uses statement node */
  LYS_AUGMENT = 0x2000,        /**< augment statement node */
  LYS_ACTION = 0x4000,         /**< action statement node */
  LYS_ANYDATA = 0x8020,        /**< anydata statement node, in tests it can be used for both #LYS_ANYXML and #LYS_ANYDATA */
  LYS_EXT = 0x10000            /**< complex extension instance, ::lys_ext_instance_complex */
}
