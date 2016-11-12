// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { elem } from "./domutil";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./views/gamesgrid/gamesgrid";
import { FilterControls } from "./views/filtercontrols/filtercontrols";
import { LoadingWall } from "./views/loadingwall/loadingwall";

export const state = new GamesBrowserState();

export function reset() {
	state.clearLocalData().then(
		() => { console.info("Local database deleted."); },
		(err) => { console.warn("Could not delete local database. Error:", err); }
	);
}

document.addEventListener("DOMContentLoaded", _ => {
	new GamesGrid(elem(".entries"), state);
	new FilterControls(elem(".filters"), state);
	new LoadingWall(elem("#smokedglass"), state);

	state.setIssue(36);
});
