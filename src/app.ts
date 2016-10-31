// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { elem } from "./domutil";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./gamesgrid";
import { FilterControls } from "./filtercontrols";

export const state = new GamesBrowserState();

document.addEventListener("DOMContentLoaded", _ => {
	new GamesGrid(elem(".entries"), state);
	new FilterControls(elem(".filters"), state);

	state.setIssue(36);
});
