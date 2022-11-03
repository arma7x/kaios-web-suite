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
        this.findContact(event.data.filter, true)
        .then(contacts => {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, data: { contacts } });
        })
        .catch(err => {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, error: error.toString() });
        });
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
        this.findContact(event.data.filter, false)
        .then(contacts => {
          if (contacts.length == 0)
            return Promise.reject("No contacts was found!");
          else
            return this.removeContact(contacts[0]);
        })
        .then(() => {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, data: true });
        })
        .catch(err => {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, error: error.toString() });
        });
        break;
      case SyncProtocol.CONTACT_SAVE:
        var contact = new mozContact(event.data.contact);
        var request = window.navigator.mozContacts.save(contact);
        request.onsuccess = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, data: true });
        }
        request.onerror = function () {
          this.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, error: error.toString() });
        }
        break;
      default:
        console.log("Unknown Type:", data.type);
    }
  }

  function findContact(filter: FilterContactParameter, toJSON: bool = false): Promise<any> {
    return new Promise((resolve, reject) => {
      var request = window.navigator.mozContacts.find(filter || {});
      request.onsuccess = function() {
        if (!toJSON) {
          resolve(this.result);
        } else {
          var contacts = [];
          this.result.forEach((contact) => {
            contacts.push(contact.toJSON());
          });
          resolve(contacts);
        }
      }
      request.onerror = function(err) {
        reject(err);
      }
    });
  }

  function removeContact(contact): Promise<any> {
    return new Promise((resolve, reject) => {
      var request = window.navigator.mozContacts.remove(contact);
      request.onsuccess = function () {
        resolve();
      }
      request.onerror = function (err) {
        reject(err);
      }
    });
  }
}

export {
  ContactSyncHub as default
}
