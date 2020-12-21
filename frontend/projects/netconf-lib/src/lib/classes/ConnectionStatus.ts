/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * States of device connection
 */
export enum ConnectionStatus {
  WAITING_FOR_CONNECTION = -2,
  CONNECTING,
  WAITING_FOR_DEVICE,
  CONNECTED,
  ERR_HTTP,
  ERR_PASSWORD_REQUIRED,
  ERR_HOSTCHECK_CONFIRMATION,
  ERR_SCHEMA_REQUIRED,
  ERR_SERVER
}
