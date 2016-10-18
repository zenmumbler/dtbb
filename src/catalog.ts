// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { loadTypedJSON } from "util";

export const enum Platform {
	Desktop = 1,
	Win = 2,
	Mac = 4,
	Linux = 8,
	Web = 16,
	Java = 32,
	VR = 64,
	Mobile = 128
}

export const PlatformList = (() => {
	var platforms: Platform[] = [];
	var platMask = Platform.Desktop;
	while (platMask <= Platform.Mobile) {
		platforms.push(platMask);
		platMask <<= 1;
	}
	return Object.freeze(platforms);
})();

export type Category = "" | "compo" | "jam";

export interface Entry {
	title: string;
	category: Category;
	description: string;
	thumbnail_url: string;
	entry_url: string;

	author: {
		name: string;
		uid: number;
		avatar_url: string;
		author_home_url: string;
	};

	screens: {
		thumbnail_url: string;
		full_url: string;
	}[];

	links: {
		title: string;
		url: string;
	}[];

	platform: Platform;
}

export type Catalog = Entry[];

export function loadCatalog(fileURL: string) {
	return loadTypedJSON<Catalog>(fileURL);
}
