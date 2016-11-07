// catalogstore.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { IndexedEntry, Platforms } from "../lib/catalog";
import { CatalogPersistence } from "../lib/catalogpersistence";
import { CatalogIndexer } from "../lib/catalogindexer";
import { SerializedTextIndex, TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { WatchableValue } from "../lib/watchable";
import { GamesBrowserState } from "./state";

export class CatalogStore {
	private persist_: CatalogPersistence;
	private indexer_: CatalogIndexer;
	private loadedIssues_: Set<number>;
	private plasticSurge_ = new TextIndex();

	// cached data
	private entryData_ = new Map<number, IndexedEntry>();
	private allSet_ = new Set<number>();
	private compoFilter_ = new Set<number>();
	private jamFilter_ = new Set<number>();
	private platformFilters_ = new Map<number, Set<number>>();
	private issueFilters_ = new Map<number, Set<number>>();

	// derived public data
	private filteredSet_: WatchableValue<Set<number>>;

	constructor(private state_: GamesBrowserState) {
		this.persist_ = new CatalogPersistence();
		this.indexer_ = new CatalogIndexer(this.persist_, "worker");
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

		if (restrictionSets.length === 0) {
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
			// Disable multiple loaded issues for now
			// this.loadedIssues_.add(newIssue);
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
									this.indexer_.importCatalogFile(newIssue).then(data => {
										this.acceptIndexedEntries(data.entries, data.textIndex);
									});
								}
							});
					}
					else {
						console.info(`No entries available locally, fall back to network load.`);
						this.indexer_.importCatalogFile(newIssue).then(data => {
							this.acceptIndexedEntries(data.entries, data.textIndex);
						});
					}
				});
		}
	}

	private acceptIndexedEntries(entries: IndexedEntry[], textIndex: TextIndex | SerializedTextIndex) {
		// reset allSet and entryData, once we support searching over all sets this can change
		// but needs different method as it's too heavy
		this.entryData_ = new Map();
		this.allSet_ = new Set();

		// cache entries in memory and update filter sets
		let updateIssueSet = false;
		let issueSet: Set<number> | undefined;
		if (entries.length > 0) {
			issueSet = this.issueFilters_.get(entries[0].ld_issue);
		}
		if (! issueSet) {
			issueSet = new Set();
			updateIssueSet = true;
		}

		for (const entry of entries) {
			const docID = entry.docID;
			this.entryData_.set(docID, entry);
			this.allSet_.add(docID);

			// create and update issue filters (first time load only)
			if (updateIssueSet) {
				issueSet.add(docID);
			}

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

		// use catalog text index as the global one
		this.plasticSurge_ = new TextIndex();
		this.plasticSurge_.import(textIndex);

		this.filtersChanged();
	}

	// static
	get filteredSet() { return this.filteredSet_.watchable; }
	get entries() { return this.entryData_; }
}
