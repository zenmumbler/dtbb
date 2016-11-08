// loadingwall.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { watchableBinding } from "./watchablebinding";
import { elem } from "./domutil";
import { GamesBrowserState } from "./state";

export class LoadingWall {
	constructor(containerElem_: HTMLElement, state_: GamesBrowserState) {
		let hideTimer_ = -1;

		state_.loading.watch(loading => {
			if (loading) {
				if (hideTimer_ > -1) {
					clearTimeout(hideTimer_);
					hideTimer_ = -1;
				}
				containerElem_.style.display = "block";
				containerElem_.classList.add("active");
				if (document.activeElement) {
					(document.activeElement as HTMLInputElement).blur();
				}
			}
			else {
				containerElem_.classList.remove("active");
				elem("#terms").focus();
				hideTimer_ = window.setTimeout(() => { containerElem_.style.display = "none"; }, 500);
			}
		});

		watchableBinding(state_.loadingRatio, elem(".bar .progress"))
			.get(el => parseInt(el.style.width || "0") / 100)
			.set((el, ratio) => { el.style.width = `${Math.round(ratio * 100)}%`; });
	}
}
