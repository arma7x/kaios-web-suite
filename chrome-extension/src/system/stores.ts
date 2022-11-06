import { get, writable } from 'svelte/store';
import { SyncProtocol } from '../../../kaios-app/src/system/sync_protocol';

export const contacts = writable(<SyncProtocol.ContactStore>{});

export function getContacts() {
  return get(contacts);
}
