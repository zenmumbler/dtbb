import { loadAndAnalyze } from "analyze";
import { catalog } from "catalog";

var grid = document.querySelector(".entries");
var entryTemplate = <HTMLTemplateElement>document.querySelector("#entry");

var entryData: catalog.Entry[] = null;
var entryElems: HTMLDivElement[] = [];

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


function updateActiveSet() {
	var count = entryElems.length;
	for (var ix = 0; ix < count; ++ix) {
		var entry = entryData[ix];
		var hasNow = activeSet.has(ix);

		var shouldHave = (entry.features & activeFilter) == activeFilter;
		if (activeCategory.length > 0) {
			shouldHave = shouldHave && (entry.category == activeCategory);
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
}


function makeEntryTile(entry: catalog.Entry, entryIndex: number) {
	var elem = <HTMLDivElement>(<Element>entryTemplate.content.cloneNode(true)).firstElementChild;
	(<HTMLImageElement>elem.querySelector("img")).src = entry.thumbnail_url;
	elem.querySelector("h2").textContent = entry.title;
	elem.querySelector("p.author span").textContent = entry.author.name;
	var pills = elem.querySelector(".pills");

	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Source) {
		if (entry.features & featMask) {
			var pill = document.createElement("span");
			pill.className = "pill";
			pill.textContent = featLabel[featMask];
			pills.appendChild(pill);

			filterSets.get(featMask).add(entryIndex);
		}
		featMask <<= 1;
	}

	return elem;
}


loadAndAnalyze().then(data => {
	entryData = data;
	var count = entryData.length;
	for (var x = 0; x < count; ++x) {
		var entry = entryData[x];
		entryElems[x] = makeEntryTile(entry, x);
		grid.appendChild(entryElems[x]);

		allSet.add(x);
		activeSet.add(x);
	}

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
