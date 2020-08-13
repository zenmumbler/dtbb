import { writable } from "svelte/store";

// filters
export const platform = writable(0);
export const category = writable("");
export const query = writable("");
export const issue = writable(46);
