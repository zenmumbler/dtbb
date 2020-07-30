// loadingwall.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-Present by @zenmumbler

import { watchableBinding } from "../../watchablebinding";
import { GamesBrowserState } from "../../state";

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
				hideTimer_ = window.setTimeout(() => { containerElem_.style.display = "none"; }, 500);
			}
		});

		watchableBinding(state_.loadingRatio, ".bar .progress", containerElem_)
			.get(el => parseInt(el.style.width || "0") / 100)
			.set((el, ratio) => { el.style.width = `${Math.round(ratio * 100)}%`; });
	}
}
