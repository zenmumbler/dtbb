// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { classifyEntries } from "analyze";
import { Catalog, Entry, Platform, PlatformList, loadCatalog } from "catalog";
import { TextIndex, SerializedTextIndex } from "textindex";
import { GamesGrid } from "gamesgrid";
import { intersectSet, loadTypedJSON, elem, elemList } from "util";

var sti_t0 = performance.now();

// -- the model and view
var entryData: Catalog = null;
var gamesGrid: GamesGrid;

// -- fulltext search engine and config
var plasticSurge = new TextIndex();
const INDEX_ON_THE_FLY = false;
const DATA_REVISION = 2;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const TEXT_INDEX_URL = "data/ld35-entries-index" + DATA_EXTENSION + "?" + DATA_REVISION;
const ENTRIES_URL = "data/ld35-entries" + DATA_EXTENSION + "?" + DATA_REVISION;


// -- initialize the static filter sets
var compoFilter = new Set<number>();
var jamFilter = new Set<number>();
var filterSets = new Map<Platform, Set<number>>();
PlatformList.forEach(p => {
	filterSets.set(p, new Set<number>());
});


var allSet = new Set<number>();
var activeFilter: Platform = 0;
var activeCategory = "";
var activeQuery = "";


function updateActiveSet() {
	var restrictionSets: Set<number>[] = [];

	// -- get list of active filter sets
	if (activeQuery.length > 0) {
		var textFilter = plasticSurge.query(activeQuery);
		if (textFilter) {
			restrictionSets.push(textFilter);
		}
	}

	if (activeCategory == "compo") {
		restrictionSets.push(compoFilter);
	}
	else if (activeCategory == "jam") {
		restrictionSets.push(jamFilter);
	}

	PlatformList.forEach(plat => {
		if (activeFilter & plat) {
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
}

const WORKER = true;
if (! INDEX_ON_THE_FLY) {
	if (!WORKER) {
		loadTypedJSON<SerializedTextIndex>(TEXT_INDEX_URL).then(sti => {
			plasticSurge.load(sti);
			var sti_t1 = performance.now();
			console.info("Load until ready (DIRECT) " + (sti_t1 - sti_t0).toFixed(1) + "ms");
			(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";
		});
	}
	else {
		var lww = new Worker("js/task_loader.js?task_loadindex");
		lww.onmessage = (e: MessageEvent) => {
			if (<string>e.data === "loaded") {
				console.info("sending index data url");
				lww.postMessage("../" + TEXT_INDEX_URL);
			}
			else {
				var sti_t1 = performance.now();
				plasticSurge = <TextIndex>e.data;
				console.info("Load until ready (WORKER) " + (sti_t1 - sti_t0).toFixed(1) + "ms");
				(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";
			}
		};
		lww.postMessage("task_loadindex");
	}
}


loadCatalog(ENTRIES_URL).then(classifyEntries).then(data => {
	entryData = data;

	var grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, entryData);

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


	window.onresize = () => {
		gamesGrid.resized();
	};


	// full text search
	var searchControl = elem<HTMLInputElement>("#terms");
	searchControl.oninput = (evt: Event) => {
		activeQuery = searchControl.value.trim();
		updateActiveSet();
	};

	searchControl.focus();


	// category radios
	var categoryControls = elemList<HTMLInputElement>("input[name=category]");
	for (let cc of categoryControls) {
		cc.onchange = (evt: Event) => {
			var ctrl = <HTMLInputElement>evt.target;
			var val = ctrl.value;

			if (ctrl.checked) {
				if (activeCategory !== val) {
					activeCategory = val;
					updateActiveSet();
				}
			}
		};
	}


	// platform selector
	var platformSelect = elem<HTMLSelectElement>("select");
	platformSelect.onchange = (evt: Event) => {
		var ctrl = <HTMLSelectElement>evt.target;
		activeFilter = parseInt(ctrl.value);
		updateActiveSet();
	};
});
