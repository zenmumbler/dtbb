// catalogpersistence.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-Present by @zenmumbler

import type { CatalogHeader, Catalog, IndexedEntry } from "./catalog";
import type { SerializedTextIndex } from "./textindex";
import { PromisedDB, deleteDatabase } from "promised-db";

interface PersistedTextIndex {
	issue: number;
	data: SerializedTextIndex;
}

const DB_NAME = "dtbb";

export class CatalogPersistence {
	private db_: PromisedDB;

	constructor() {
		this.db_ = new PromisedDB(DB_NAME, [
			(db) => {
				console.info("Creating stores and indexes...");
				const headers = db.createObjectStore("headers", { keyPath: "issue" });
				const textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
				const entries = db.createObjectStore("entries", { keyPath: "docID" });

				// duplicates of primary index to allow for keyCursor ops
				headers.createIndex("issue", "issue", { unique: true });
				textindexes.createIndex("issue", "issue", { unique: true });
				entries.createIndex("issue", "ld_issue");
			}
		]);
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
			(tx, {}) => {
				const textindexes = tx.objectStore("textindexes");
				textindexes.put(data);
			})
			.catch(error => {
				console.warn("Error saving textindex: ", error);
				throw error;
			});
	}

	persistedIssues() {
		return this.db_.transaction<CatalogHeader[]>("headers", "readonly",
			(tx, { request }) => {
				const issueIndex = tx.objectStore("headers").index("issue");
				return request(issueIndex.getAll());
			})
			.catch(() => [] as CatalogHeader[]);
	}

	loadCatalog(issue: number) {
		return this.db_.transaction(["headers", "entries", "textindexes"], "readonly",
			(tx, {request, timeout}) => {
				timeout(5000);
				const headerP = request<CatalogHeader>(tx.objectStore("headers").get(issue));
				const issueIndex = tx.objectStore("entries").index("issue");
				const entriesP = request<IndexedEntry[]>(issueIndex.getAll(issue));
				const ptiP = request(tx.objectStore("textindexes").get(issue));

				return Promise.all([headerP, entriesP, ptiP])
					.then((result) => {
						const pti = result[2] as PersistedTextIndex | undefined;
						return {
							header: result[0],
							entries: result[1],
							sti: pti && pti.data
						};
					});
			});
	}

	destroyCatalog(issue: number) {
		return this.db_.transaction(["entries"], "readonly",
			(tx, {request}) => {
				const issueIndex = tx.objectStore("entries").index("issue");
				return request<number[]>(issueIndex.getAllKeys(issue));
			})
			.then(entryKeys => {
				return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite",
					(tx, {}) => {
						const headers = tx.objectStore("headers");
						const entries = tx.objectStore("entries");
						const indexes = tx.objectStore("textindexes");

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
			(tx, {}) => {
				const headers = tx.objectStore("headers");
				const entries = tx.objectStore("entries");
				const indexes = tx.objectStore("textindexes");

				headers.clear();
				entries.clear();
				indexes.clear();
			});
	}

	deleteDatabase() {
		this.db_.close();
		return deleteDatabase(DB_NAME);
	}
}
