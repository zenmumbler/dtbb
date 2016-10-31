// filtercontrols.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Category } from "../lib/catalog";
// import { arrayFromSet } from "../lib/setutil";
import { elem, elemList } from "./domutil";
import { GamesBrowserState } from "./state";

export class FilterControls {
	constructor(containerElem_: HTMLElement, state_: GamesBrowserState) {
		// issue selector
		const issueSelect = elem<HTMLSelectElement>("select[data-filter=issue]", containerElem_);
		issueSelect.onchange = _ => {
			state_.setIssue(parseInt(issueSelect.value));
		};
		state_.issue.watch(newIssue => {
			const curIssue = parseInt(issueSelect.value);
			if (curIssue !== newIssue) {
				issueSelect.value = String(newIssue);
			}
		});

		// category radios
		const categoryControls = elemList<HTMLInputElement>("input[name=category]", containerElem_);
		for (const cc of categoryControls) {
			cc.onchange = evt => {
				const ctrl = <HTMLInputElement>evt.target;
				if (ctrl.checked) {
					state_.setCategory(<Category>ctrl.value);
				}
			};
		}

		// platform selector
		const platformSelect = elem<HTMLSelectElement>("select[data-filter=platform]", containerElem_);
		platformSelect.onchange = _ => {
			state_.setPlatform(parseInt(platformSelect.value));
		};

		// full text search
		const searchControl = elem<HTMLInputElement>("#terms", containerElem_);
		searchControl.oninput = _ => {
			state_.setQuery(searchControl.value);
		};

		searchControl.focus();
	}
}
