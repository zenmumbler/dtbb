// catalogstore.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, IndexedEntry, Platforms, maskForPlatformKeys } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { PromiseDB } from "../lib/promisedb";
import { loadTypedJSON } from "./domutil";
import { WatchableValue } from "../lib/watchable";
import { GamesBrowserState } from "./state";

export function makeDocID(issue: number, entryIndex: number) {
	// this imposes a limit of 65536 entries per issue
	return (issue << 16) | entryIndex;
}

class CatalogPersistence {
	private db_: PromiseDB;

	constructor() {
		this.db_ = new PromiseDB("dtbb", 1,
			(db, _oldVersion, _newVersion) => {
				db.createObjectStore("entries", { keyPath: "docID" });
			});
	}

	saveEntries(entries: IndexedEntry[]) {
		return this.db_.transaction("entries", "readwrite",
			(tr, {request}) => {
				const store = tr.objectStore("entries");

				for (const entry of entries) {
					request(store.add(entry)).catch(
						err => { console.warn(`Could not save entry`, err); }
					);
				}
			});
	}

	enumEntries() {
		this.db_.transaction("entries", "readonly",
			(tr, {cursor}) => {
				const store = tr.objectStore("entries");
				cursor(store)
					.next(cur => {
						console.info("entry");
						cur.continue();
					})
					.complete(() => {
						console.info("done");
					});
			});
	}
}


export class CatalogStore {
	private persist_: CatalogPersistence;
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
		this.loadCatalog(newIssue);
	}

	private storeCatalog(_catalog: Catalog, indexedEntries: IndexedEntry[]) {
		this.persist_.saveEntries(indexedEntries).then(() => { console.info("saved 'em!"); });
	}

	private acceptCatalogData(catalog: Catalog) {
		const entries = catalog.entries.map(entry => {
			const indEntry = entry as IndexedEntry;
			indEntry.indexes = {
				platformMask: 0
			};
			return indEntry;
		});

		// index all text and populate filter sets
		const count = entries.length;
		const t0 = performance.now();
		for (let entryIndex = 0; entryIndex < count; ++entryIndex) {
			const docID = makeDocID(catalog.issue, entryIndex);
			this.allSet_.add(docID);

			const entry = entries[entryIndex];
			entry.docID = docID;
			entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);

			// update issue filter
			let issueSet = this.issueFilters_.get(entry.ld_issue);
			if (! issueSet) {
				issueSet = new Set<number>();
				this.issueFilters_.set(entry.ld_issue, issueSet);
			}
			issueSet.add(docID);

			// add entry in docID slot of full entries array
			this.entryData_.set(docID, entry);

			// add docID to various filtersets
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

			// index text of entry
			this.plasticSurge_.indexRawString(entry.title, docID);
			this.plasticSurge_.indexRawString(entry.author.name, docID);
			this.plasticSurge_.indexRawString(entry.description, docID);
			for (const link of entry.links) {
				this.plasticSurge_.indexRawString(link.label, docID);
			}
		}
		const t1 = performance.now();

		console.info("Text Indexing took " + (t1 - t0).toFixed(1) + "ms");
		this.storeCatalog(catalog, entries);

		this.filtersChanged();
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
