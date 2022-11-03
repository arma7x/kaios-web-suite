export enum SyncProtocol {
  PING,
  PONG,
  SMS_GET_THREAD,
  SMS_GET_MESSAGES,
  SMS_SEND_MESSAGE_SMS,
  SMS_SEND_MESSAGE_MMS,
  SMS_DELETE_MESSAGE,
  SMS_READ_MESSAGE,
  SMS_SMSC_ADDRESS,
  CONTACT_CLEAR,
  CONTACT_FIND,
  CONTACT_GET_ALL,
  CONTACT_GET_COUNT,
  CONTACT_GET_REVISION,
  CONTACT_REMOVE,
  CONTACT_SAVE,
}

export type BroadcastCallback = (data: any) => void;

export interface FilterContactParameter {
  filterBy: Array<string>,
  filterValue: string,
  filterOp: string,
  filterLimit: number,
}
