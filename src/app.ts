// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { loadAndAnalyze } from "analyze";
import { catalog } from "catalog";
import { TextIndex, SerializedTextIndex } from "textindex";
import { GamesGrid } from "gamesgrid";
import { unionSet, loadTypedJSON } from "util";

// -- the model and view
var entryData: catalog.Entry[] = null;
var gamesGrid: GamesGrid;

// -- fulltext search engine and config
var plasticSurge = new TextIndex();
const INDEX_ON_THE_FLY = true;
const INDEX_REVISION = 2;
const INDEX_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const TEXT_INDEX_URL = `data/ld35-entries-index-${INDEX_REVISION}` + INDEX_EXTENSION;

// -- initialize the static filter sets
var compoFilter = new Set<number>();
var jamFilter = new Set<number>();

var filterSets = new Map<catalog.EntryFeatures, Set<number>>();
(() => {
	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Last) {
		filterSets.set(featMask, new Set<number>());
		featMask <<= 1;
	}
})();


var allSet = new Set<number>();
var activeFilter: catalog.EntryFeatures = 0;
var activeCategory = "";
var activeQuery = "";


function updateActiveSet() {
	var t0 = performance.now();
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

	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Last) {
		if (activeFilter & featMask) {
			restrictionSets.push(filterSets.get(featMask));
		}
		featMask <<= 1;
	}

	// -- combine all filters
	var resultSet: Set<number>;

	if (restrictionSets.length == 0) {
		resultSet = allSet;
	}
	else {
		restrictionSets.sort((a, b) => { return a.size < b.size ? -1 : 1 });

		resultSet = new Set(restrictionSets[0]);
		for (var tisix = 1; tisix < restrictionSets.length; ++tisix) {
			resultSet = unionSet(resultSet, restrictionSets[tisix]);
		}
	}

	var t1 = performance.now();
	console.info("Sets: " + (t1 - t0).toFixed(1) + "ms");

	// -- apply
	gamesGrid.activeSetChanged(resultSet);
}


if (! INDEX_ON_THE_FLY) {
	loadTypedJSON<SerializedTextIndex>(TEXT_INDEX_URL).then(sti => {
		var t0 = performance.now();
		plasticSurge.load(sti);
		var t1 = performance.now();
		console.info("STI load took " + (t1 - t0).toFixed(1) + "ms");
		(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";
	});
}


loadAndAnalyze().then(data => {
	entryData = data;

	var grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, entryData);

	// index all text and populate filter sets
	var count = entryData.length;
	var t0 = performance.now();
	for (var x = 0; x < count; ++x) {
		allSet.add(x);

		var entry = entryData[x];

		var featMask = 1;
		while (featMask <= catalog.EntryFeatures.Last) {
			if (entry.features & featMask) {
				filterSets.get(featMask).add(x);
			}
			featMask <<= 1;
		}

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
	var searchControl = <HTMLInputElement>(document.querySelector("#terms"));
	searchControl.oninput = (evt: Event) => {
		activeQuery = searchControl.value.trim();
		updateActiveSet();
	};


	// category radios
	var categoryControls = <HTMLInputElement[]>([].slice.call(document.querySelectorAll("input[name=category]"), 0));
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


	// filter checkboxes
	var filterControls = <HTMLInputElement[]>([].slice.call(document.querySelectorAll("input[name=feature]"), 0));
	for (let fc of filterControls) {
		fc.onchange = (evt: Event) => {
			var ctrl = <HTMLInputElement>evt.target;
			var val = parseInt(ctrl.value);

			if (ctrl.checked) {
				activeFilter |= val;
			}
			else {
				activeFilter &= ~val;
			}
			updateActiveSet();
		};
	}
});
