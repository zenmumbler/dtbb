// catalogpersistence.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { CatalogHeader, Catalog, IndexedEntry } from "../lib/catalog";
import { SerializedTextIndex } from "../lib/textindex";
import { PromiseDB } from "../lib/promisedb";

interface PersistedTextIndex {
	issue: number;
	data: SerializedTextIndex;
}

export class CatalogPersistence {
	private db_: PromiseDB;

	constructor() {
		this.db_ = new PromiseDB("dtbb", 1,
			(db, _oldVersion, _newVersion) => {
				console.info("Creating stores and indexes...");
				const headers = db.createObjectStore("headers", { keyPath: "issue" });
				const textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
				const entries = db.createObjectStore("entries", { keyPath: "docID" });

				// duplicates of primary index to allow for keyCursor ops
				headers.createIndex("issue", "issue", { unique: true });
				textindexes.createIndex("issue", "issue", { unique: true });

				// these indexes are not currently used, but adding them now anyway
				// this app needs a composite index over these 3 fields but composite + multiEntry is not allowed...
				entries.createIndex("issue", "ld_issue");
				entries.createIndex("category", "category");
				entries.createIndex("platform", "platforms", { multiEntry: true });
			});
	}

	saveCatalog(catalog: Catalog, indEntries: IndexedEntry[], sti: SerializedTextIndex) {
		const header: CatalogHeader = {
			issue: catalog.issue,
			theme: catalog.theme,
			stats: catalog.stats
		};

		return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
			(tr, {request}) => {
				console.info(`Storing issue ${header.issue} with ${indEntries.length} entries and textindex`);
				const headers = tr.objectStore("headers");
				const entries = tr.objectStore("entries");
				const textindexes = tr.objectStore("textindexes");

				request(headers.put(header));

				const textIndex: PersistedTextIndex = {
					issue: catalog.issue,
					data: sti
				};
				request(textindexes.put(textIndex));

				for (const entry of indEntries) {
					request(entries.put(entry));
				}
			})
			.catch(error => {
				console.warn(`Error saving catalog ${catalog.issue}`, error);
				throw error;
			});
	}

	saveCatalogTextIndex(issue: number, sti: SerializedTextIndex) {
		const data: PersistedTextIndex = {
			issue,
			data: sti
		};

		return this.db_.transaction("textindexes", "readwrite",
			(tr, {request}) => {
				const textindexes = tr.objectStore("textindexes");
				request(textindexes.put(data));
			})
			.catch(error => {
				console.warn("Error saving textindex: ", error);
				throw error;
			});
	}

	persistedIssues() {
		return this.db_.transaction("headers", "readonly",
			(tr, {getAllKeys}) => {
				const issueIndex = tr.objectStore("headers").index("issue");
				return getAllKeys<number>(issueIndex, undefined, "nextunique"); // while the key is "unique", a bug in Saf10 makes multiple indexes. Fixed in STP.
			})
			.catch(() => [] as number[]);
	}

	loadCatalog(issue: number) {
		return this.db_.transaction(["headers", "entries", "textindexes"], "readonly",
			(tr, {request, getAll}) => {
				const headerP = request(tr.objectStore("headers").get(issue));
				const issueIndex = tr.objectStore("entries").index("issue");
				const entriesP = getAll<IndexedEntry>(issueIndex, issue);
				const ptiP = request(tr.objectStore("textindexes").get(issue));

				return Promise.all([headerP, entriesP, ptiP])
					.then((result) => {
						const pti = result[2] as PersistedTextIndex | undefined;
						return {
							header: result[0] as CatalogHeader,
							entries: result[1] as IndexedEntry[],
							sti: pti && pti.data
						};
					});
			})
			.catch(() => null);
	}

	destroyCatalog(issue: number) {
		return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
			(tr, {request, getAllKeys}) => {
				const headers = tr.objectStore("headers");
				const entries = tr.objectStore("entries");
				const issueIndex = entries.index("issue");
				const indexes = tr.objectStore("textindexes");

				getAllKeys<number>(issueIndex, issue)
					.then(entryKeys => {
						for (const key of entryKeys) {
							request(entries.delete(key));
						}
					});

				request(headers.delete(issue));
				request(indexes.delete(issue));
			});
	}
}
