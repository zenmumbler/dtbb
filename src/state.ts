// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Category, Platform } from "catalog";

export class GamesBrowserState {
	private platformMask_: Platform = 0;
	private category_: Category = "";
	private query_ = "";

	get platformMask() { return this.platformMask_; }
	get category() { return this.category_; }
	get query() { return this.query_; }
}