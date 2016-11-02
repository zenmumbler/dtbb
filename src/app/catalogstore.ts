// catalogstore.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { CatalogHeader, Catalog, IndexedEntry, Platforms, maskForPlatformKeys } from "../lib/catalog";
import { SerializedTextIndex, TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { PromiseDB } from "../lib/promisedb";
import { loadTypedJSON } from "./domutil";
import { WatchableValue } from "../lib/watchable";
import { GamesBrowserState } from "./state";

function makeDocID(issue: number, entryIndex: number) {
	// this imposes a limit of 65536 entries per issue
	return (issue << 16) | entryIndex;
}

interface PersistedTextIndex {
	issue: number;
	data: SerializedTextIndex;
}

class CatalogPersistence {
	private db_: PromiseDB;

	constructor() {
		this.db_ = new PromiseDB("dtbb", 1,
			(db, _oldVersion, _newVersion) => {
				console.info("Creating stores and indexes...");
				const headers = db.createObjectStore("headers", { keyPath: "issue" });
				const textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
				const entries = db.createObjectStore("entries", { keyPath: "docID" });

				// duplicates of primary index to allow for keyCursor ops
				headers.createIndex("issue", "issue");
				textindexes.createIndex("issue", "issue");

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
				return getAllKeys<number>(issueIndex);
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
}


export class CatalogStore {
	private persist_: CatalogPersistence;
	private loadedIssues_: Set<number>;
	private plasticSurge_ = new TextIndex();

	// static data
	private entryData_ = new Map<number, IndexedEntry>();
	private allSet_ = new Set<number>();
	private compoFilter_ = new Set<number>();
	private jamFilter_ = new Set<number>();
	private platformFilters_ = new Map<number, Set<number>>();
	private issueFilters_ = new Map<number, Set<number>>();

	// derived data
	private filteredSet_: WatchableValue<Set<number>>;

	constructor(private state_: GamesBrowserState) {
		this.persist_ = new CatalogPersistence();
		this.loadedIssues_ = new Set<number>();

		for (const pk in Platforms) {
			this.platformFilters_.set(Platforms[pk].mask, new Set<number>());
		}

		this.filteredSet_ = new WatchableValue(new Set<number>());

		// watch some other state data
		state_.query.watch(_ => this.filtersChanged());
		state_.category.watch(_ => this.filtersChanged());
		state_.platform.watch(_ => this.filtersChanged());

		state_.issue.watch(issue => this.issueChanged(issue));
	}

	private filtersChanged() {
		const restrictionSets: Set<number>[] = [];

		const query = this.state_.query.get();
		const category = this.state_.category.get();
		const platform = this.state_.platform.get();
		const issue = this.state_.issue.get();

		// -- get list of active filter sets
		if (query.length > 0) {
			const textFilter = this.plasticSurge_.query(query);
			if (textFilter) {
				restrictionSets.push(textFilter);
			}
		}

		if (category === "compo") {
			restrictionSets.push(this.compoFilter_);
		}
		else if (category === "jam") {
			restrictionSets.push(this.jamFilter_);
		}

		for (const pk in Platforms) {
			const plat = Platforms[pk];
			if (platform & plat.mask) {
				restrictionSets.push(this.platformFilters_.get(plat.mask)!);
			}
		}

		const issueSet = this.issueFilters_.get(issue);
		if (issueSet) {
			restrictionSets.push(issueSet);
		}

		// -- combine all filters
		let resultSet: Set<number>;

		if (restrictionSets.length == 0) {
			resultSet = this.allSet_;
		}
		else {
			restrictionSets.sort((a, b) => { return a.size < b.size ? -1 : 1; });

			resultSet = new Set(restrictionSets[0]);
			for (let tisix = 1; tisix < restrictionSets.length; ++tisix) {
				resultSet = intersectSet(resultSet, restrictionSets[tisix]);
			}
		}

		this.filteredSet_.set(resultSet);
	}

	private issueChanged(newIssue: number) {
		if (this.loadedIssues_.has(newIssue)) {
			console.info(`Already have this issue ${newIssue} loaded`);
			this.filtersChanged();
		}
		else {
			this.loadedIssues_.add(newIssue);
			this.persist_.persistedIssues()
				.then(issues => {
					console.info(`Checking persisted issues: ${issues}`);
					if (issues.indexOf(newIssue) > -1) {
						this.persist_.loadCatalog(newIssue)
							.then(catalog => {
								console.info(`Got catalog from local DB`);
								if (catalog && catalog.header && catalog.entries && catalog.sti && catalog.entries.length === catalog.header.stats.entries) {
									console.info(`Catalog looks good, loading entries and textindex`);
									this.acceptIndexedEntries(catalog.entries, catalog.sti);
								}
								else {
									console.info(`Catalog data smelled funny, fall back to network load.`);
									this.loadCatalog(newIssue);
								}
							});
					}
					else {
						console.info(`No entries available locally, fall back to network load.`);
						this.loadCatalog(newIssue);
					}
				});
		}
	}

	private storeCatalog(catalog: Catalog, indexedEntries: IndexedEntry[], textIndex: TextIndex) {
		this.persist_.saveCatalog(catalog, indexedEntries, textIndex.export())
			.then(() => {
				console.info(`saved issue ${catalog.issue}`);
			});
	}

	private acceptIndexedEntries(entries: IndexedEntry[], textIndex: TextIndex | SerializedTextIndex) {
		// cache entries in memory and update filter sets
		for (const entry of entries) {
			const docID = entry.docID;
			this.entryData_.set(docID, entry);
			this.allSet_.add(docID);

			// create and update issue filters
			let issueSet = this.issueFilters_.get(entry.ld_issue);
			if (! issueSet) {
				issueSet = new Set<number>();
				this.issueFilters_.set(entry.ld_issue, issueSet);
			}
			issueSet.add(docID);

			// update platform filters
			for (const pk in Platforms) {
				const plat = Platforms[pk];
				if (entry.indexes.platformMask & plat.mask) {
					this.platformFilters_.get(plat.mask)!.add(docID);
				}
			}

			if (entry.category === "compo") {
				this.compoFilter_.add(docID);
			}
			else {
				this.jamFilter_.add(docID);
			}
		}

		// merge catalog text index into global one
		this.plasticSurge_.import(textIndex);

		this.filtersChanged();
	}

	private acceptCatalogData(catalog: Catalog) {
		const entries = catalog.entries.map(entry => {
			const indEntry = entry as IndexedEntry;
			indEntry.indexes = {
				platformMask: 0
			};
			return indEntry;
		});

		// index catalog
		const count = entries.length;
		const textIndex = new TextIndex();
		for (let entryIndex = 0; entryIndex < count; ++entryIndex) {
			const entry = entries[entryIndex];
			const docID = makeDocID(catalog.issue, entryIndex);
			entry.docID = docID;
			entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);

			// index text of entry
			textIndex.indexRawString(entry.title, docID);
			textIndex.indexRawString(entry.author.name, docID);
			textIndex.indexRawString(entry.description, docID);
			for (const link of entry.links) {
				textIndex.indexRawString(link.label, docID);
			}
		}

		// persist indexed catalog in local db
		this.storeCatalog(catalog, entries, textIndex);

		// integrate indexed catalog in memory
		this.acceptIndexedEntries(entries, textIndex);
	}

	private loadCatalog(issue: number) {
		const revision = 1;
		const extension = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
		const entriesURL = `data/ld${issue}_entries${extension}?${revision}`;

		return loadTypedJSON<Catalog>(entriesURL).then(catalog => {
			this.acceptCatalogData(catalog);
		});
	}

	// static
	get filteredSet() { return this.filteredSet_.watchable; }
	get entries() { return this.entryData_; }
}
