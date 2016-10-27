// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Category, Catalog } from "../lib/catalog";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./gamesgrid";
import { loadTypedJSON, elem, elemList } from "./domutil";

// -- config
const DATA_REVISION = 1;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;

// -- components
var gamesGrid: GamesGrid;
export const state = new GamesBrowserState();

loadTypedJSON<Catalog>(ENTRIES_URL).then(catalog => {
	state.acceptCatalogData(catalog);
	(<HTMLElement>document.querySelector(".pleasehold")).style.display = "none";

	// -- view components
	const grid = <HTMLElement>document.querySelector(".entries");
	gamesGrid = new GamesGrid(grid, state);

	// full text search
	const searchControl = elem<HTMLInputElement>("#terms");
	searchControl.oninput = _ => {
		state.query = searchControl.value;
	};

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
		state.platform = parseInt(ctrl.value);
	};

	searchControl.focus();
});
