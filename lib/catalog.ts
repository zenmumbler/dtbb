// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export interface EntryListing {
	links: string[];
	thumbs: string[];
}

export const enum Platform {
	None = 0,
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
	const platforms: Platform[] = [];
	let platMask = Platform.Desktop;
	while (platMask <= Platform.Mobile) {
		platforms.push(platMask);
		platMask <<= 1;
	}
	return Object.freeze(platforms);
})();

export type Category = "" | "compo" | "jam";

export interface Entry {
	ld_issue: number;

	title: string;
	category: Category;
	description: string;
	thumbnail_url: string;
	entry_url: string;

	author: {
		name: string;
		uid: number;
		avatar_url: string;
		home_url: string;
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
