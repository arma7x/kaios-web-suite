export enum SyncProtocol {
  PING,
  PONG,
  SMS_GET_THREAD,
  SMS_GET_MESSAGES,
  SMS_SEND_MESSAGE,
  SMS_DELETE_MESSAGE,
  SMS_READ_MESSAGE,
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
