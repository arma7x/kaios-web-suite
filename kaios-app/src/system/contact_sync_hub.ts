declare var navigator:any;

import { SyncProtocol, BroadcastCallback, type MozContactChangeEvent, MozContactChangeEventReason } from './sync_protocol';

class ContactSyncHub {

  broadcastCallback: BroadcastCallback;

  constructor(callback: BroadcastCallback) {
    this.broadcastCallback = callback;
    navigator.mozContacts.addEventListener('contactchange', (evt: MozContactChangeEvent) => {
      let data = {
        contactID: evt.contactID,
        contact: evt.contact ? evt.contact.toJSON() : null,
      }
      switch (evt.reason) {
        case MozContactChangeEventReason.UPDATE:
          data.type = SyncProtocol.CONTACT_EVENT_UPDATE;
          this.broadcastCallback({ type: SyncProtocol.CONTACT_EVENT_UPDATE, data: data });
          break;
        case MozContactChangeEventReason.CREATE:
          data.type = SyncProtocol.CONTACT_EVENT_CREATE;
          this.broadcastCallback({ type: SyncProtocol.CONTACT_EVENT_CREATE, data: data });
          break;
        case MozContactChangeEventReason.REMOVE:
          data.type = SyncProtocol.CONTACT_EVENT_REMOVE;
          this.broadcastCallback({ type: SyncProtocol.CONTACT_EVENT_REMOVE, data: data });
          break;
      }
    });
  }

  filterEvent(event: any) {
    // console.log('ContactSyncHub.filterEvent: ', event.type);
    var _self = this;
    switch (event.type) {
      case SyncProtocol.CONTACT_CLEAR:
        try {
          var request = window.navigator.mozContacts.clear();
          request.onsuccess = function () {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_CLEAR, data: true });
          }
          request.onerror = function (err) {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_CLEAR, error: err.toString() });
          }
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_CLEAR, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_FIND:
        try {
          _self.findContact(event.data ? event.data.filter : {} || {}, true)
          .then(contacts => {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, data: { contacts } });
          })
          .catch(err => {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, error: err.toString() });
          });
        } catch(err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_FIND, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_ALL:
        try {
          var contacts = [];
          var count = 0;
          var request = window.navigator.mozContacts.getAll(event.data ? event.data.filter : {} || {});
          request.onsuccess = function() {
            if(this.result) {
              count++;
              contacts.push(this.result.toJSON());
              this.continue();
            } else {
              _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_ALL, data: { contacts, count } });
            }
          }
          request.onerror = function(err) {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_ALL, error: err.toString() });
          }
        } catch(err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_ALL, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_COUNT:
        try {
          var request = window.navigator.mozContacts.getCount();
          request.onsuccess = function () {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_COUNT, data: this.result });
          }
          request.onerror = function (err) {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_COUNT, error: err.toString() });
          }
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_COUNT, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_GET_REVISION:
        try {
          var request = window.navigator.mozContacts.getRevision();
          request.onsuccess = function () {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_REVISION, data: this.result });
          }
          request.onerror = function (err) {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_REVISION, error: err.toString() });
          }
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_GET_REVISION, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_REMOVE:
        try {
          _self.findContact(event.data.filter, false)
          .then(contacts => {
            if (contacts.length == 0)
              return Promise.reject("No contacts was found!");
            else
              return _self.removeContact(contacts[0]);
          })
          .then(() => {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, data: true });
          })
          .catch(err => {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, error: err.toString() });
          });
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_REMOVE, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_SAVE:
        try {
          var contact = new mozContact(event.data.contact);
          if (contact.bday)
            contact.bday = new Date(contact.bday);
          if (contact.anniversary)
            contact.anniversary = new Date(contact.anniversary);
          var request = window.navigator.mozContacts.save(contact);
          request.onsuccess = function () {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, data: true });
          }
          request.onerror = function (err) {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, error: err.toString() });
          }
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_SAVE, error: err.toString() });
        }
        break;
      case SyncProtocol.CONTACT_UPDATE:
        try {
          const filter = {
            filterBy: ['id'],
            filterValue: event.data.contact.id,
            filterOp: 'equals',
            filterLimit: 1
          };
          _self.findContact(filter, false)
          .then(contacts => {
            if (contacts.length == 0)
              return Promise.reject("No contacts was found!");
            else {
              const excepts = ["id", "published", "updated"];
              var contact = contacts[0];
              if (contact.bday)
                contact.bday = new Date(contact.bday);
              if (contact.anniversary)
                contact.anniversary = new Date(contact.anniversary);
              Object.keys(contact.toJSON()).forEach(key => {
                if (excepts.indexOf(key) === -1) {
                  contact[key] = event.data.contact[key] || null;
                }
              });
              var request = window.navigator.mozContacts.save(contact);
              request.onsuccess = function () {
                _self.broadcastCallback({ type: SyncProtocol.CONTACT_UPDATE, data: true });
              }
              request.onerror = function (err) {
                _self.broadcastCallback({ type: SyncProtocol.CONTACT_UPDATE, error: err.toString() });
              }
            }
          })
          .catch(err => {
            _self.broadcastCallback({ type: SyncProtocol.CONTACT_UPDATE, error: err.toString() });
          });
        } catch (err) {
          _self.broadcastCallback({ type: SyncProtocol.CONTACT_UPDATE, error: err.toString() });
        }
        break;
    }
  }

  findContact(filter: FilterContactOption, toJSON: bool = false): Promise<any> {
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

  removeContact(contact): Promise<any> {
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
