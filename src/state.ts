// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, IndexedEntry, Category, Platforms, maskForPlatformKeys } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { Watchable } from "../lib/watchable";

// -- filter sets
const allSet = new Set<number>();
const compoFilter = new Set<number>();
const jamFilter = new Set<number>();
const filterSets = new Map<number, Set<number>>();
for (const pk in Platforms) {
	filterSets.set(Platforms[pk].mask, new Set<number>());
}

export function makeDocID(issue: number, entryIndex: number) {
	// this imposes a limit of 65536 entries per issue
	return (issue << 16) | entryIndex;
}

export class GamesBrowserState {
	private plasticSurge_ = new TextIndex();

	// store data
	private entryData_: Map<number, IndexedEntry>;
	private filteredSet_: Watchable<Set<number>>;

	private platformMask_ = 0;
	private category_: Category | "" = "";
	private query_ = "";

	constructor() {
		this.filteredSet_ = new Watchable(new Set<number>());
		this.entryData_ = new Map<number, IndexedEntry>();
	}

	private filtersChanged() {
		const restrictionSets: Set<number>[] = [];

		// -- get list of active filter sets
		if (this.query_.length > 0) {
			const textFilter = this.plasticSurge_.query(this.query_);
			if (textFilter) {
				restrictionSets.push(textFilter);
			}
		}

		if (this.category_ === "compo") {
			restrictionSets.push(compoFilter);
		}
		else if (this.category_ === "jam") {
			restrictionSets.push(jamFilter);
		}

		for (const pk in Platforms) {
			const plat = Platforms[pk];
			if (this.platformMask_ & plat.mask) {
				restrictionSets.push(filterSets.get(plat.mask)!);
			}
		}

		// -- combine all filters
		let resultSet: Set<number>;

		if (restrictionSets.length == 0) {
			resultSet = allSet;
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

	// actions
	acceptCatalogData(catalog: Catalog) {
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
			allSet.add(docID);

			const entry = entries[entryIndex];
			entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);

			// add entry in docID slot of full entries array
			this.entryData_.set(docID, entry);

			// add docID to various filtersets
			for (const pk in Platforms) {
				const plat = Platforms[pk];
				if (entry.indexes.platformMask & plat.mask) {
					filterSets.get(plat.mask)!.add(docID);
				}
			}

			if (entry.category === "compo") {
				compoFilter.add(docID);
			}
			else {
				jamFilter.add(docID);
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
	}

	// mutations
	get query() { return this.query_; }
	set query(q: string) {
		this.query_ = q;
		this.filtersChanged();
	}

	get category() { return this.category_; }
	set category(c: Category | "") {
		this.category_ = c;
		this.filtersChanged();
	}

	get platform() { return this.platformMask_; }
	set platform(p: number) {
		this.platformMask_ = p;
		this.filtersChanged();
	}

	// getters
	get filteredSet() { return this.filteredSet_; }
	get entries() { return this.entryData_; }

	get allSet() { return allSet; }
}
