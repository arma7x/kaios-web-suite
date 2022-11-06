import { get, writable } from 'svelte/store';

export const contacts = writable([]);

export function getContacts() {
  return get(contacts);
}
