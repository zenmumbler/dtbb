import { writable } from "svelte/store";
import { IssueData } from "../lib/catalog";

// filters
export const platform = writable(0);
export const category = writable("");
export const query = writable("");

const latestIssue = Object.values(IssueData).sort((a, b) => b.issue - a.issue)[0].issue;
export const issue = writable(latestIssue);
