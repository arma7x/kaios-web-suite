export enum SyncProtocol {
  PING                    = "PING",
  PONG                    = "PONG",
  SMS_GET_THREAD          = "SMS_GET_THREAD",
  SMS_GET_MESSAGES        = "SMS_GET_MESSAGES",
  SMS_SEND_MESSAGE_SMS    = "SMS_SEND_MESSAGE_SMS",
  SMS_SEND_MESSAGE_MMS    = "SMS_SEND_MESSAGE_MMS",
  SMS_DELETE_MESSAGE      = "SMS_DELETE_MESSAGE",
  SMS_READ_MESSAGE        = "SMS_READ_MESSAGE",
  SMS_SMSC_ADDRESS        = "SMS_SMSC_ADDRESS",
  SMS_ON_DELIVERY_ERROR   = "SMS_ON_DELIVERY_ERROR",
  SMS_ON_DELIVERY_SUCCESS = "SMS_ON_DELIVERY_SUCCESS",
  SMS_ON_RECEIVED         = "SMS_ON_RECEIVED",
  SMS_ON_RETRIEVING       = "SMS_ON_RETRIEVING",
  SMS_ON_SENT             = "SMS_ON_SENT",
  SMS_ON_SENDING          = "SMS_ON_SENDING",
  SMS_ON_FAILED           = "SMS_ON_FAILED",
  CONTACT_CLEAR           = "CONTACT_CLEAR",
  CONTACT_FIND            = "CONTACT_FIND",
  CONTACT_GET_ALL         = "CONTACT_GET_ALL",
  CONTACT_GET_COUNT       = "CONTACT_GET_COUNT",
  CONTACT_GET_REVISION    = "CONTACT_GET_REVISION",
  CONTACT_REMOVE          = "CONTACT_REMOVE",
  CONTACT_SAVE            = "CONTACT_SAVE",
}

export type BroadcastCallback = (data: any) => void;

export enum FilterOp {
  EQUALS =      "equals",
  STARTS_WITH = "startsWith",
  MATCH =       "match",
}

export interface FilterContactOption {
  filterBy: Array<string>,
  filterValue: string,
  filterOp: FilterOp,
  filterLimit: number,
}

// https://contest-server.cs.uchicago.edu/ref/JavaScript/developer.mozilla.org/en-US/docs/Archive/B2G_OS/API/MozSmsEvent.html
export interface MozSmsEvent {
  [key: string]: any
}

// https://contest-server.cs.uchicago.edu/ref/JavaScript/developer.mozilla.org/en-US/docs/Archive/B2G_OS/API/MozMmsEvent.html
export interface MozMmsEvent {
  [key: string]: any
}

export enum MessageType {
  SMS = "sms",
  MMS = "mms",
}

export enum MessageClass {
  NORMAL  = "normal",
  CLASS_0 = "class-0",
  CLASS_1 = "class-1",
  CLASS_2 = "class-2",
  CLASS_3 = "class-3",
}

// Objects contain an id, a location, and a content which is a Blob.
export interface MmsAttachment {
  id: string|number,
  location: string,
  content: Blob,
}

// https://contest-server.cs.uchicago.edu/ref/JavaScript/developer.mozilla.org/en-US/docs/Archive/B2G_OS/API/MozSmsMessage.html
export interface MozSmsMessage {
  type: MessageType,          // a string with the value sms.
  id: string|number,          // a number representing the id of the message.
  threadId: string|number,    // a number representing the id of the thread the message is part of.
  body: string,               // a DOMString with text of the message.
  delivery: string,           // a DOMString which represents the state of the message delivery on the device point of view
  deliveryStatus: string,     // a DOMString which represents the state of the message delivery on the receiver point of view
  read: bool,                 // a Boolean indicating whether a message is read or unread.
  receiver: string,           // a DOMString with the name of the receiver.
  sender: string,             // a DOMString with the name of the sender.
  timestamp: Date,            // a Date object with the timestamp of the message.
  messageClass: MessageClass, // a DOMString which enum MessageClass
}

// https://contest-server.cs.uchicago.edu/ref/JavaScript/developer.mozilla.org/en-US/docs/Archive/B2G_OS/API/MozMmsMessage.html
export interface MozMmsMessage {
  type: MessageType,                 // a string with the value mms.
  id: string|number,                 // a number representing the id of the message.
  threadId: string|number,           // a number representing the id of the thread the message is part of.
  subject: string,                   // a DOMString representing the subject of the message.
  smil: string,                      // a DOMString representing the SMIL content of the message.
  attachments: Array<MmsAttachment>, // an array of objects representing the attachment necessary to the SMIL content, which is MmsAttachment
  expiryDate: Date,                  // a Date object representing the expiry date for an MMS to be manully downloaded.
  delivery: string,                  // a DOMString which represents the state of the message delivery on the device point of view
  deliveryStatus: Array<string>,     // a Array of DOMString which represents the state of the message delivery on the receivers point of view
  read: bool,                        // a Boolean indicating whether a message is read or unread.
  receivers: Array<string>,          // an array of DOMString with the phone numbers of each receiver.
  sender: string,                    // a DOMString with the name of the sender.
  timestamp: Date,                   // a Date object with the timestamp of the message.
}
