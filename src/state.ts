// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, IndexedEntry, Category, Platforms, IssueThemeNames, maskForPlatformKeys } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { loadTypedJSON } from "./domutil";
import { WatchableValue } from "../lib/watchable";

export function makeDocID(issue: number, entryIndex: number) {
	// this imposes a limit of 65536 entries per issue
	return (issue << 16) | entryIndex;
}

export class GamesBrowserState {
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

	// direct properties
	private platformMask_: WatchableValue<number>;
	private category_: WatchableValue<Category | "">;
	private query_: WatchableValue<string>;
	private issue_: WatchableValue<number>;

	constructor() {
		for (const pk in Platforms) {
			this.platformFilters_.set(Platforms[pk].mask, new Set<number>());
		}

		this.filteredSet_ = new WatchableValue(new Set<number>());
		this.platformMask_ = new WatchableValue(0);
		this.category_ = new WatchableValue<Category | "">("");
		this.query_ = new WatchableValue("");
		this.issue_ = new WatchableValue(0);
	}


	private filtersChanged() {
		const restrictionSets: Set<number>[] = [];
		const query = this.query_.get();
		const category = this.category_.get();
		const platform = this.platformMask_.get();

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

		const issueSet = this.issueFilters_.get(this.issue.get());
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

		this.filtersChanged();
	}


	loadCatalog(issue: number) {
		const revision = 1;
		const extension = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
		const entriesURL = `data/ld${issue}_entries${extension}?${revision}`;

		return loadTypedJSON<Catalog>(entriesURL).then(catalog => {
			this.acceptCatalogData(catalog);
		});
	}


	// filters
	get query() { return this.query_.watchable; }
	get category() { return this.category_.watchable; }
	get platform() { return this.platformMask_.watchable; }
	get issue() { return this.issue_.watchable; }

	setQuery(q: string) {
		this.query_.set(q);
		this.filtersChanged();
	}

	setCategory(c: Category | "") {
		this.category_.set(c);
		this.filtersChanged();
	}

	setPlatform(p: number) {
		this.platformMask_.set(p);
		this.filtersChanged();
	}

	setIssue(newIssue: number) {
		if (newIssue !== this.issue_.get() && (newIssue in IssueThemeNames)) {
			this.issue_.set(newIssue);
			this.loadCatalog(newIssue);
		}
	}

	// static / derived data
	get allSet() { return this.allSet_; }
	get filteredSet() { return this.filteredSet_.watchable; }
	get entries() { return this.entryData_; }
}
