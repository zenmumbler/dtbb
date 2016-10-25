// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, Entry, Category, PlatformMask, PlatformList } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet, newSetFromArray } from "../lib/setutil";

// -- config
const DATA_REVISION = 1;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;

// -- components
var entryData: Entry[] | null = null;
const plasticSurge = new TextIndex();


// -- filter sets
const allSet = new Set<number>();
const compoFilter = new Set<number>();
const jamFilter = new Set<number>();
const filterSets = new Map<PlatformMask, Set<number>>();
PlatformList.forEach(p => {
	filterSets.set(p, new Set<number>());
});


state.onChange(function() {
	const restrictionSets: Set<number>[] = [];

	// -- get list of active filter sets
	if (state.query.length > 0) {
		const textFilter = plasticSurge.query(state.query);
		if (textFilter) {
			restrictionSets.push(textFilter);
		}
	}

	if (state.category == "compo") {
		restrictionSets.push(compoFilter);
	}
	else if (state.category == "jam") {
		restrictionSets.push(jamFilter);
	}

	PlatformList.forEach(plat => {
		if (state.platformMask & plat) {
			restrictionSets.push(filterSets.get(plat)!);
		}
	});

	// -- combine all filters
	var resultSet: Set<number>;

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
});


export class GamesBrowserState {

}
