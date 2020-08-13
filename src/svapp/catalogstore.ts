// catalogstore.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-Present by @zenmumbler

import { writable, derived } from "svelte/store";
import { loadTypedJSON } from "../lib/fileutil";
import { CatalogHeader, IndexedEntry, Platforms, Manifest } from "../lib/catalog";
import { CatalogPersistence } from "../lib/catalogpersistence";
import { CatalogIndexer } from "../lib/catalogindexer";
import { SerializedTextIndex, TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";
import { category, issue, query, platform } from "./stores";

// watchables and local data
export const loading = writable(true);
export const loadingRatio = writable(0);
export const entries = writable(new Map<number, IndexedEntry>());
const allSet = writable(new Set<number>());

// commands
export function nukeAndPave() {
	indexer.stop();
	return persister.deleteDatabase();
}

// cached data
let compoFilter = new Set<number>();
let jamFilter = new Set<number>();
let platformFilters = new Map<number, Set<number>>();

for (const pk in Platforms) {
	platformFilters.set(Platforms[pk].mask, new Set<number>());
}

// indexer
const isMobile = navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|windows phone/) !== null;
const persister = new CatalogPersistence();
const indexer = new CatalogIndexer(persister, isMobile ? "local" : "worker");
let plasticSurge = new TextIndex();

// catalog manifest file
let manifest = loadTypedJSON<Manifest>("data/manifest.json")
	.then(mdata => {
		mdata.issues = mdata.issues.map(mentry => {
			mentry.updatedAt = new Date(Date.parse((mentry.updatedAt as any) as string)); // convert ISO string from JSON into Date
			return mentry;
		});
		return mdata;
	});

export const filteredSet = derived([query, category, platform, allSet],
	([query, category, platform, allSet]) => {
		const restrictionSets: Set<number>[] = [];

		// -- get list of active filter sets
		if (query.length > 0) {
			const textFilter = plasticSurge.query(query);
			if (textFilter) {
				restrictionSets.push(textFilter);
			}
		}

		if (category === "compo") {
			restrictionSets.push(compoFilter);
		}
		else if (category === "jam") {
			restrictionSets.push(jamFilter);
		}

		for (const pk in Platforms) {
			const plat = Platforms[pk];
			if (platform & plat.mask) {
				restrictionSets.push(platformFilters.get(plat.mask)!);
			}
		}

		// -- combine all filters
		let resultSet: Set<number>;

		if (restrictionSets.length === 0) {
			resultSet = allSet;
		}
		else {
			restrictionSets.sort((a, b) => a.size < b.size ? -1 : 1);

			resultSet = new Set(restrictionSets[0]);
			for (let tisix = 1; tisix < restrictionSets.length; ++tisix) {
				resultSet = intersectSet(resultSet, restrictionSets[tisix]);
			}
		}

		return resultSet;
	});

issue.subscribe((newIssue: number) => {
	loadingRatio.set(0);
	loading.set(true);

	const finished = (entries: IndexedEntry[], textIndex: TextIndex | SerializedTextIndex) => {
		acceptIndexedEntries(entries, textIndex);
		loadingRatio.set(1);
		loading.set(false);
	};

	const loadRemote = () => {
		indexer.importCatalogFile(newIssue, ratio => { loadingRatio.set(ratio); })
			.then(data => {
				finished(data.entries, data.textIndex);
			});
	};

	Promise.all<CatalogHeader[], Manifest>([persister.persistedIssues(), manifest])
		.then(([headers, manifest]) => {
			console.info(`Local issues available: ${headers.map(h => h.issue)}`);
			const local = headers.find(h => h.issue === newIssue);
			const remote = manifest.issues.find(me => me.issue === newIssue);

			if (local && remote) {
				if ((local.savedAt || 0) < remote.updatedAt) {
					console.info(`The server copy of issue ${newIssue} is newer than the local copy, fall back to network load.`);
					loadRemote();
				}
				else {
					persister.loadCatalog(newIssue)
						.then(catalog => {
							console.info(`Got catalog from local DB`);
							if (catalog && catalog.header && catalog.entries && catalog.sti && catalog.entries.length === catalog.header.stats.entries) {
								console.info(`Catalog looks good, loading entries and textindex`);
								finished(catalog.entries, catalog.sti);
							}
							else {
								console.info(`Catalog data smelled funny, fall back to network load.`);
								loadRemote();
							}
						});
				}
			}
			else {
				console.info(`No entries available locally, fall back to network load.`);
				loadRemote();
			}
		});
});

function acceptIndexedEntries(entryData: IndexedEntry[], textIndex: TextIndex | SerializedTextIndex) {
	const newEntries = new Map<number, IndexedEntry>();
	const newAll = new Set<number>();
	compoFilter = new Set();
	jamFilter = new Set();
	for (const pk in Platforms) {
		const plat = Platforms[pk];
		platformFilters.set(plat.mask, new Set());
	}

	// cache entries in memory and update filter sets
	for (const entry of entryData) {
		const docID = entry.docID;
		newEntries.set(docID, entry);
		newAll.add(docID);

		// update platform filters
		for (const pk in Platforms) {
			const plat = Platforms[pk];
			if (entry.indexes.platformMask & plat.mask) {
				platformFilters.get(plat.mask)!.add(docID);
			}
		}

		if (entry.category === "compo") {
			compoFilter.add(docID);
		}
		else {
			jamFilter.add(docID);
		}
	}

	// use catalog text index as the global one
	plasticSurge = new TextIndex();
	plasticSurge.import(textIndex);
	entries.set(newEntries);
	allSet.set(newAll);
}
