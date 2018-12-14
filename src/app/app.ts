// app.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-8 by Arthur Langereis (@zenmumbler)

import { elem, elemList } from "./domutil";

import { GamesBrowserState } from "./state";
import { GamesGrid } from "./views/gamesgrid/gamesgrid";
import { FilterControls } from "./views/filtercontrols/filtercontrols";
import { LoadingWall } from "./views/loadingwall/loadingwall";

export const state = new GamesBrowserState();

// this function is a hacky way to allow anyone to completely get rid of the local database
// - which can become rather large - pending a UI to do this.
export function reset() {
	console.info("Deleting local data, please wait, this can take a while...");

	elemList<HTMLSelectElement>("select").forEach(e => e.disabled = true);
	elem("#smokedglass").style.display = "block";
	elem(".status").style.display = "none";
	elem("#smokedglass").classList.add("active");

	state.clearLocalData().then(
		() => { console.info("Local database deleted, when you reload the page a new database will be created."); },
		(err) => { console.warn("Could not delete local database. Error:", err); }
	);
}

document.addEventListener("DOMContentLoaded", _ => {
	new GamesGrid(elem(".entries"), state);
	new FilterControls(elem(".filters"), state);
	new LoadingWall(elem("#smokedglass"), state);

	state.setIssue(43);
	console.info("Hi! If you ever need to delete all local data cached by DTBB just run: `dtbb.reset()` in your console while on this page. Have fun!");
});
