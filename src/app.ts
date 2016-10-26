// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Entry, Category, Catalog, PlatformMask, PlatformList } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { intersectSet } from "../lib/setutil";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./gamesgrid";
import { loadTypedJSON, elem, elemList } from "./domutil";

// -- config
const DATA_REVISION = 1;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;

// -- components
var entryData: Entry[] | null = null;
var gamesGrid: GamesGrid;
const state = new GamesBrowserState();
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

	// -- apply
	gamesGrid.activeSetChanged(resultSet);
});


loadTypedJSON<Catalog>(ENTRIES_URL).then(catalog => {
	state.acceptCatalogData(catalog);
	(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";

	// -- view

	const grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, state);

	window.onresize = () => {
		gamesGrid.resized();
	};


	// full text search
	const searchControl = elem<HTMLInputElement>("#terms");
	searchControl.oninput = _ => {
		state.query = searchControl.value;
	};

	searchControl.focus();


	// category radios
	const categoryControls = elemList<HTMLInputElement>("input[name=category]");
	for (let cc of categoryControls) {
		cc.onchange = (evt: Event) => {
			const ctrl = <HTMLInputElement>evt.target;
			if (ctrl.checked) {
				state.category = <Category>ctrl.value;
			}
		};
	}


	// platform selector
	const platformSelect = elem<HTMLSelectElement>("select");
	platformSelect.onchange = (evt: Event) => {
		const ctrl = <HTMLSelectElement>evt.target;
		state.platformMask = parseInt(ctrl.value);
	};
});
