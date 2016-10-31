// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog } from "../lib/catalog";
import { loadTypedJSON, elem } from "./domutil";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./gamesgrid";
import { FilterControls } from "./filtercontrols";

// -- config
const DATA_REVISION = 1;
const DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
const ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;

// -- state
export const state = new GamesBrowserState();

loadTypedJSON<Catalog>(ENTRIES_URL).then(catalog => {
	state.acceptCatalogData(catalog);
	(elem(".pleasehold")).style.display = "none";

	// -- view components
	new GamesGrid(elem(".entries"), state);
	new FilterControls(elem(".filters"), state);
});
