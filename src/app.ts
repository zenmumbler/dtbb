// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { classifyEntries } from "analyze";
import { Category, Catalog, Entry, Platform, PlatformList, loadCatalog } from "catalog";
import { TextIndex, SerializedTextIndex } from "textindex";
import { GamesBrowserState } from "state";
import { GamesGrid } from "gamesgrid";
import { intersectSet, loadTypedJSON, elem, elemList } from "util";

// -- config
const INDEX_ON_THE_FLY = false;
const DATA_REVISION = 1;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const TEXT_INDEX_URL = "data/ld36-entries-index" + DATA_EXTENSION + "?" + DATA_REVISION;
const ENTRIES_URL = "data/ld36-entries" + DATA_EXTENSION + "?" + DATA_REVISION;

// -- components
var entryData: Catalog = null;
var gamesGrid: GamesGrid;
var state = new GamesBrowserState();
var plasticSurge = new TextIndex();


// -- filter sets
var allSet = new Set<number>();
var compoFilter = new Set<number>();
var jamFilter = new Set<number>();
var filterSets = new Map<Platform, Set<number>>();
PlatformList.forEach(p => {
	filterSets.set(p, new Set<number>());
});


state.onChange(function (state: GamesBrowserState) {
	var restrictionSets: Set<number>[] = [];

	// -- get list of active filter sets
	if (state.query.length > 0) {
		var textFilter = plasticSurge.query(state.query);
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
			restrictionSets.push(filterSets.get(plat));
		}
	});

	// -- combine all filters
	var resultSet: Set<number>;

	if (restrictionSets.length == 0) {
		resultSet = allSet;
	}
	else {
		restrictionSets.sort((a, b) => { return a.size < b.size ? -1 : 1 });

		resultSet = new Set(restrictionSets[0]);
		for (var tisix = 1; tisix < restrictionSets.length; ++tisix) {
			resultSet = intersectSet(resultSet, restrictionSets[tisix]);
		}
	}

	// -- apply
	gamesGrid.activeSetChanged(resultSet);
});


if (! INDEX_ON_THE_FLY) {
	loadTypedJSON<SerializedTextIndex>(TEXT_INDEX_URL).then(sti => {
		plasticSurge.load(sti);
		(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";
	});
}


loadCatalog(ENTRIES_URL).then(classifyEntries).then(data => {
	entryData = data;

	// index all text and populate filter sets
	var count = entryData.length;
	var t0 = performance.now();
	for (var x = 0; x < count; ++x) {
		allSet.add(x);

		var entry = entryData[x];

		PlatformList.forEach(plat => {
			if (entry.platform & plat) {
				filterSets.get(plat).add(x);
			}
		});

		if (entry.category == "compo") {
			compoFilter.add(x);
		}
		else {
			jamFilter.add(x);	
		}

		if (INDEX_ON_THE_FLY) {
			// build fulltext index on-the-fly
			plasticSurge.indexRawString(entry.title, x);
			plasticSurge.indexRawString(entry.author.name, x);
			plasticSurge.indexRawString(entry.description, x);
			for (var link of entry.links) {
				plasticSurge.indexRawString(link.title, x);
			}
		}
	}
	var t1 = performance.now();

	if (INDEX_ON_THE_FLY) {
		console.info("Text Indexing took " + (t1 - t0).toFixed(1) + "ms");
		(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";
	}


	// -- view

	var grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, entryData);

	window.onresize = () => {
		gamesGrid.resized();
	};


	// full text search
	var searchControl = elem<HTMLInputElement>("#terms");
	searchControl.oninput = (evt: Event) => {
		state.query = searchControl.value;
	};

	searchControl.focus();


	// category radios
	var categoryControls = elemList<HTMLInputElement>("input[name=category]");
	for (let cc of categoryControls) {
		cc.onchange = (evt: Event) => {
			var ctrl = <HTMLInputElement>evt.target;
			if (ctrl.checked) {
				state.category = <Category>ctrl.value;
			}
		};
	}


	// platform selector
	var platformSelect = elem<HTMLSelectElement>("select");
	platformSelect.onchange = (evt: Event) => {
		var ctrl = <HTMLSelectElement>evt.target;
		state.platformMask = parseInt(ctrl.value);
	};
});
