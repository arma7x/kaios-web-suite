import { get, writable } from 'svelte/store';
import { type ContactStore } from '../../../kaios-app/src/system/sync_protocol';

export const contactStorage = writable(<ContactStore>{});

export function getContactStorage() {
  return get(contactStorage);
}
