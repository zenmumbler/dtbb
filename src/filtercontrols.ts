// filtercontrols.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Platforms, Category } from "../lib/catalog";
// import { arrayFromSet } from "../lib/setutil";
import { elem, elemList } from "./domutil";
import { GamesBrowserState } from "./state";

export class FilterControls {
	constructor(containerElem_: HTMLElement, state_: GamesBrowserState) {
		// full text search
		const searchControl = elem<HTMLInputElement>("#terms", containerElem_);
		searchControl.oninput = _ => {
			state_.query = searchControl.value;
		};

		// category radios
		const categoryControls = elemList<HTMLInputElement>("input[name=category]", containerElem_);
		for (const cc of categoryControls) {
			cc.onchange = evt => {
				const ctrl = <HTMLInputElement>evt.target;
				if (ctrl.checked) {
					state_.category = <Category>ctrl.value;
				}
			};
		}

		// platform selector
		const platformSelect = elem<HTMLSelectElement>("select", containerElem_);
		platformSelect.onchange = evt => {
			const ctrl = <HTMLSelectElement>evt.target;
			state_.platform = parseInt(ctrl.value);
		};
		for (const platKey in Platforms) {
			const plat = Platforms[platKey];
			const pe = document.createElement("option");
			pe.value = String(plat.mask);
			pe.textContent = plat.label;
			
		}

		searchControl.focus();
	}
}
