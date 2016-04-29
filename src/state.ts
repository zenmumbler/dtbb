// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Category, Platform, PlatformList } from "catalog";
import { intersectSet } from "util";

export type StateListener = (state: GamesBrowserState) => void;

export class GamesBrowserState {
	private listeners_: StateListener[] = [];

	private platformMask_: Platform = 0;
	private category_: Category = "";
	private query_ = "";

	get platformMask() { return this.platformMask_; }

	set platformMask(newPlat: Platform) {
		if (newPlat != this.platformMask_) {
			this.platformMask_ = newPlat;
			this.filtersChanged();
		}
	}

	get category() { return this.category_; }

	set category(newCat: Category) {
		if (newCat != this.category_) {
			this.category_ = newCat;
			this.filtersChanged();
		}
	}

	get query() { return this.query_; }

	set query(newQuery: string) {
		if (newQuery != this.query_) {
			this.query_ = newQuery;
			this.filtersChanged();
		}
	}

	private filtersChanged() {
		for (const l of this.listeners_) {
			l(this);
		}
	}

	onChange(listener: StateListener) {
		this.listeners_.push(listener);
	}
}
