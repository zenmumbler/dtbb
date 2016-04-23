import { loadAndAnalyze } from "analyze";
import { catalog } from "catalog";
import TextIndex from "textindex";
import { GamesGrid } from "gamesgrid";
import { unionSet } from "util";

// -- the model, view and fulltext engine
var entryData: catalog.Entry[] = null;
var gamesGrid: GamesGrid;
var plasticSurge = new TextIndex();


// -- initialize the static filter sets
var compoFilter = new Set<number>();
var jamFilter = new Set<number>();

var filterSets = new Map<catalog.EntryFeatures, Set<number>>();
(() => {
	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Source) {
		filterSets.set(featMask, new Set<number>());
		featMask <<= 1;
	}
})();


var allSet = new Set<number>();
var activeFilter: catalog.EntryFeatures = 0;
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

	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Source) {
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

	// -- apply
	gamesGrid.activeSetChanged(resultSet);
}


loadAndAnalyze().then(data => {
	entryData = data;

	var grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, entryData);

	// index all text and populate filter sets
	var count = entryData.length;
	for (var x = 0; x < count; ++x) {
		allSet.add(x);

		var entry = entryData[x];

		var featMask = 1;
		while (featMask <= catalog.EntryFeatures.Source) {
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

		plasticSurge.indexRawString(entry.title, x);
		plasticSurge.indexRawString(entry.author.name, x);
		plasticSurge.indexRawString(entry.description, x);
	}


	window.onresize = () => {
		gamesGrid.resized();
	};


	// click to go to LD
	grid.addEventListener("click", (evt: MouseEvent) => {
		var tgt = <HTMLElement>evt.target;
		while (tgt && (tgt.dataset["eix"] == null)) {
			tgt = tgt.parentElement;
		}
		if (tgt && tgt.dataset["eix"] != null) {
			var eix = parseInt(tgt.dataset["eix"]);
			var ldURL = entryData[eix].entry_url;
			window.open(ldURL, "_blank");
		}
	});


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
