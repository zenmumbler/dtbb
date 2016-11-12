// catalogpersistence.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { CatalogHeader, Catalog, IndexedEntry } from "./catalog";
import { SerializedTextIndex } from "./textindex";
import { PromiseDB } from "./promisedb";

interface PersistedTextIndex {
	issue: number;
	data: SerializedTextIndex;
}

const DB_NAME = "dtbb";

export class CatalogPersistence {
	private db_: PromiseDB;

	constructor() {
		this.db_ = new PromiseDB(DB_NAME, 1,
			(db, _oldVersion, _newVersion) => {
				console.info("Creating stores and indexes...");
				const headers = db.createObjectStore("headers", { keyPath: "issue" });
				const textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
				const entries = db.createObjectStore("entries", { keyPath: "docID" });

				// duplicates of primary index to allow for keyCursor ops
				headers.createIndex("issue", "issue", { unique: true });
				textindexes.createIndex("issue", "issue", { unique: true });
				entries.createIndex("issue", "ld_issue");
			});
	}

	saveCatalog(catalog: Catalog, indEntries: IndexedEntry[], sti: SerializedTextIndex) {
		const header: CatalogHeader = {
			issue: catalog.issue,
			theme: catalog.theme,
			stats: catalog.stats,
			savedAt: new Date()
		};

		return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
			(tr, { timeout }) => {
				console.info(`Storing issue ${header.issue} with ${indEntries.length} entries and textindex`);
				timeout(10000);

				const headers = tr.objectStore("headers");
				const entries = tr.objectStore("entries");
				const textindexes = tr.objectStore("textindexes");

				headers.put(header);

				const textIndex: PersistedTextIndex = {
					issue: catalog.issue,
					data: sti
				};
				textindexes.put(textIndex);

				for (const entry of indEntries) {
					entries.put(entry);
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
			(tr, {}) => {
				const textindexes = tr.objectStore("textindexes");
				textindexes.put(data);
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
			(tr, {request, getAll, timeout}) => {
				timeout(5000);
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
		return this.db_.transaction(["entries"], "readonly",
			(tr, {getAllKeys}) => {
				const issueIndex = tr.objectStore("entries").index("issue");
				return getAllKeys<number>(issueIndex, issue);
			})
			.then(entryKeys => {
				console.info("entryKeys", entryKeys);
				return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
					(tr, {}) => {
						const headers = tr.objectStore("headers");
						const entries = tr.objectStore("entries");
						const indexes = tr.objectStore("textindexes");

						if (entryKeys.length > 0) {
							const range = IDBKeyRange.bound(entryKeys[0], entryKeys[entryKeys.length - 1]);
							entries.delete(range);
						}

						headers.delete(issue);
						indexes.delete(issue);
					});
			});
	}

	purgeAllData() {
		return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
			(tr, {}) => {
				const headers = tr.objectStore("headers");
				const entries = tr.objectStore("entries");
				const indexes = tr.objectStore("textindexes");

				headers.clear();
				entries.clear();
				indexes.clear();
			});
	}

	deleteDatabase() {
		this.db_.close();
		return new Promise((resolve, reject) => {
			const req = indexedDB.deleteDatabase(DB_NAME);
			req.onerror = (err) => { reject(err); };
			req.onsuccess = () => { resolve(); };
		});
	}
}
