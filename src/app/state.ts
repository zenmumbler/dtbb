// state.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Category, IssueThemeNames } from "../lib/catalog";
import { WatchableValue } from "../lib/watchable";
import { CatalogStore } from "./catalogstore";

export class GamesBrowserState {
	// direct properties
	private platformMask_: WatchableValue<number>;
	private category_: WatchableValue<Category | "">;
	private query_: WatchableValue<string>;
	private issue_: WatchableValue<number>;

	// static data
	private catalogStore_: CatalogStore;

	constructor() {
		this.platformMask_ = new WatchableValue(0);
		this.category_ = new WatchableValue<Category | "">("");
		this.query_ = new WatchableValue("");
		this.issue_ = new WatchableValue(0);

		// catalogStore depends on the watchables, so create it last
		this.catalogStore_ = new CatalogStore(this);
	}

	// filters
	get query() { return this.query_.watchable; }
	get category() { return this.category_.watchable; }
	get platform() { return this.platformMask_.watchable; }
	get issue() { return this.issue_.watchable; }

	setQuery(q: string) {
		this.query_.set(q);
	}

	setCategory(c: Category | "") {
		this.category_.set(c);
	}

	setPlatform(p: number) {
		this.platformMask_.set(p);
	}

	setIssue(newIssue: number) {
		if (newIssue !== this.issue_.get() && (newIssue in IssueThemeNames)) {
			this.issue_.set(newIssue);
		}
	}

	// pass along properties from catalogstore
	get filteredSet() { return this.catalogStore_.filteredSet; }
	get entries() { return this.catalogStore_.entries; }
}
