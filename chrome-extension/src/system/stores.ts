import { get, writable } from 'svelte/store';
import { type ContactStore } from '../../../kaios-app/src/system/sync_protocol';

export const contacts = writable(<ContactStore>{});

export function getContacts() {
  return get(contacts);
}
