// filtercontrols.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { watchableBinding } from "./watchablebinding";
import { GamesBrowserState } from "./state";
import { elem } from "./domutil";

export class FilterControls {
	constructor(containerElem_: HTMLElement, state_: GamesBrowserState) {
		// LD issue selector
		watchableBinding(state_.issue, "select[data-filter=issue]", containerElem_)
			.broadcast(issue => { state_.setIssue(issue); });

		// category radios
		watchableBinding(state_.category, "input[name=category]", containerElem_)
			.broadcast(category => { state_.setCategory(category); });

		// platform selector
		watchableBinding(state_.platform, "select[data-filter=platform]", containerElem_)
			.broadcast(platform => { state_.setPlatform(platform); });

		// query terms
		watchableBinding(state_.query, "#terms", containerElem_)
			.broadcast(query => { state_.setQuery(query); });

		state_.loading.watch(loading => {
			if (! loading) {
				elem<HTMLInputElement>("#terms").focus();
			}
		});
	}
}
