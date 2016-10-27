// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, IndexedEntry, Category, Platforms, maskForPlatformKeys } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet/*, newSetFromArray*/ } from "../lib/setutil";
import { Watchable } from "../lib/watchable";

// -- filter sets
const allSet = new Set<number>();
const compoFilter = new Set<number>();
const jamFilter = new Set<number>();
const filterSets = new Map<number, Set<number>>();
for (const pk in Platforms) {
	filterSets.set(Platforms[pk].mask, new Set<number>());
}


export class GamesBrowserState {
	private plasticSurge_ = new TextIndex();

	// store data
	private entryData_: IndexedEntry[];
	private filteredSet_: Watchable<Set<number>>;
	private platformMask_ = 0;
	private category_: Category | "" = "";
	private query_ = "";

	constructor() {
		this.filteredSet_ = new Watchable(new Set<number>());
		this.entryData_ = [];
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
		this.entryData_ = catalog.entries.map(entry => {
			const indEntry = entry as IndexedEntry;
			indEntry.indexes = {
				platformMask: 0
			};
			return indEntry;
		});

		// index all text and populate filter sets
		const count = this.entryData_.length;
		const t0 = performance.now();
		for (let x = 0; x < count; ++x) {
			allSet.add(x);

			const entry = this.entryData_[x];
			entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);

			for (const pk in Platforms) {
				const plat = Platforms[pk];
				if (entry.indexes.platformMask & plat.mask) {
					filterSets.get(plat.mask)!.add(x);
				}
			}

			if (entry.category === "compo") {
				compoFilter.add(x);
			}
			else {
				jamFilter.add(x);
			}

			// build fulltext index on-the-fly
			this.plasticSurge_.indexRawString(entry.title, x);
			this.plasticSurge_.indexRawString(entry.author.name, x);
			this.plasticSurge_.indexRawString(entry.description, x);
			for (const link of entry.links) {
				this.plasticSurge_.indexRawString(link.label, x);
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
}
