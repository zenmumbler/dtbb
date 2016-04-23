import { loadAndAnalyze } from "analyze";
import { catalog } from "catalog";
import TextIndex from "textindex";
import { GamesGrid } from "gamesgrid";

var plasticSurge = new TextIndex();
var gamesGrid: GamesGrid;

var entryData: catalog.Entry[] = null;

var featLabel: { [f: number]: string } = {};
featLabel[catalog.EntryFeatures.Win] = "Win";
featLabel[catalog.EntryFeatures.Mac] = "Mac";
featLabel[catalog.EntryFeatures.Linux] = "Linux";
featLabel[catalog.EntryFeatures.HTML5] = "HTML5";
featLabel[catalog.EntryFeatures.WebGL] = "WebGL";
featLabel[catalog.EntryFeatures.Unity] = "Unity";
featLabel[catalog.EntryFeatures.Java] = "Java";
featLabel[catalog.EntryFeatures.Love] = "Löve";
featLabel[catalog.EntryFeatures.Flash] = "Flash";
featLabel[catalog.EntryFeatures.VR] = "VR";
featLabel[catalog.EntryFeatures.Mobile] = "Mobile";
featLabel[catalog.EntryFeatures.Source] = "Source";

var filterSets = new Map<catalog.EntryFeatures, Set<number>>();
filterSets.set(catalog.EntryFeatures.Win, new Set<number>());
filterSets.set(catalog.EntryFeatures.Mac, new Set<number>());
filterSets.set(catalog.EntryFeatures.Linux, new Set<number>());
filterSets.set(catalog.EntryFeatures.HTML5, new Set<number>());
filterSets.set(catalog.EntryFeatures.WebGL, new Set<number>());
filterSets.set(catalog.EntryFeatures.Unity, new Set<number>());
filterSets.set(catalog.EntryFeatures.Java, new Set<number>());
filterSets.set(catalog.EntryFeatures.Love, new Set<number>());
filterSets.set(catalog.EntryFeatures.Flash, new Set<number>());
filterSets.set(catalog.EntryFeatures.VR, new Set<number>());
filterSets.set(catalog.EntryFeatures.Mobile, new Set<number>());
filterSets.set(catalog.EntryFeatures.Source, new Set<number>());


var allSet = new Set<number>();
var activeSet = new Set<number>();
var activeFilter: catalog.EntryFeatures = 0;
var activeCategory = "";
var activeQuery = "";


function updateActiveSet() {
/*
	var count = entryElems.length;

	var searchSet: Set<number> = null;
	if (activeQuery.length > 0) {
		searchSet = plasticSurge.query(activeQuery);
	}

	for (var ix = 0; ix < count; ++ix) {
		var entry = entryData[ix];
		var hasNow = activeSet.has(ix);

		var shouldHave = (entry.features & activeFilter) == activeFilter;
		if (activeCategory.length > 0) {
			shouldHave = shouldHave && (entry.category == activeCategory);
		}
		if (searchSet) {
			shouldHave = shouldHave && (searchSet.has(ix));
		}

		if (hasNow !== shouldHave) {
			if (shouldHave) {
				activeSet.add(ix);
				entryElems[ix].style.display = "";
			}
			else {
				activeSet.delete(ix);
				entryElems[ix].style.display = "none";
			}
		}
	}
*/
}


loadAndAnalyze().then(data => {
	entryData = data;
	var count = entryData.length;

	var grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, entryData);

	// index all text
	for (var x = 0; x < count; ++x) {
		allSet.add(x);

		var entry = entryData[x];
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
		activeQuery = searchControl.value;
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
