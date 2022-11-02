declare var navigator:any;

import { SyncProtocol, BroadcastCallback } from './sync_protocol';

class ContactSyncHub {

  broadcastCallback: BroadcastCallback;

  constructor(callback: BroadcastCallback) {
    this.broadcastCallback = callback;
  }

  filterEvent(event: any) {
    switch (event.type) {
      case SyncProtocol.CONTACT_CLEAR:
        var request = window.navigator.mozContacts.clear();
        request.onsuccess = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_CLEAR, data: true });
        }
        request.onerror = function (error) {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_CLEAR, error: error.toString() });
        }
        break;
      case SyncProtocol.CONTACT_FIND:
        var request = window.navigator.mozContacts.find(event.data.filter);
        request.onsuccess = function () {
          var contacts = [];
          this.result.forEach((contact) => {
            contacts.push(contact.toJSON());
          });
          this.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, data: { contacts } });
        }
        request.onerror = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, error: error.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_ALL:
        var contacts = [];
        var count = 0;
        var request = window.navigator.mozContacts.getAll(event.data.filter || {});
        request.onsuccess = function() {
          if(this.result) {
            count++;
            contacts.push(this.result.toJSON());
            this.continue();
          } else {
            this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_ALL, data: { contacts, count } });
          }
        }
        request.onerror = function() {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_ALL, error: error.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_COUNT:
        var request = window.navigator.mozContacts.getCount();
        request.onsuccess = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_COUNT, data: this.result });
        }
        request.onerror = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_COUNT, error: error.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_REVISION:
        var request = window.navigator.mozContacts.getRevision();
        request.onsuccess = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_REVISION, data: this.result });
        }
        request.onerror = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_GET_REVISION, error: error.toString() });
        }
        break;
      case SyncProtocol.CONTACT_REMOVE:
        // find event.data.id
        this.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, data: [] });
        break;
      case SyncProtocol.CONTACT_SAVE:
        // var contact = new mozContact(event.data.contact);
        this.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, data: [] });
        break;
      default:
        console.log("Unknown Type:", data.type);
    }
  }
}

export {
  ContactSyncHub as default
}
