// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export interface EntryListing {
	links: string[];
	thumbs: string[];
}

// ----

export type Platform = "desktop" | "win" | "mac" | "linux" | "web" | "java" | "vr" | "mobile";

export const enum PlatformMask {
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
	const platforms: PlatformMask[] = [];
	let platMask = PlatformMask.Desktop;
	while (platMask <= PlatformMask.Mobile) {
		platforms.push(platMask);
		platMask <<= 1;
	}
	return Object.freeze(platforms);
})();

export function nameListForPlatformMask(mask: PlatformMask): Platform[] {
	const names: Platform[] = [];

	if (mask & PlatformMask.Desktop) { names.push("desktop"); }
	if (mask & PlatformMask.Win) { names.push("win"); }
	if (mask & PlatformMask.Mac) { names.push("mac"); }
	if (mask & PlatformMask.Linux) { names.push("linux"); }
	if (mask & PlatformMask.Web) { names.push("web"); }
	if (mask & PlatformMask.Java) { names.push("java"); }
	if (mask & PlatformMask.VR) { names.push("vr"); }
	if (mask & PlatformMask.Mobile) { names.push("mobile"); }

	return names;
}

// ----

export type Category = "compo" | "jam";

export type RatingArea = "audio" | "community" | "coolness" | "fun" | "graphics" | "humor" | "innovation" | "overall" | "theme";

export interface EntryRating {
	area: RatingArea;
	rank: number;
	score: number;
}

export interface LabelledLink {
	label: string;
	url: string;
}

export interface Screenshot {
	thumbnail_url: string;
	full_url: string;
}

export interface Author {
	name: string;
	uid: number;
	avatar_url: string;
	home_url: string;
}

export interface Entry {
	ld_issue: number;

	title: string;
	category: Category;
	description: string;
	thumbnail_url: string;
	entry_url: string;

	author: Author;
	screens: Screenshot[];
	links: LabelledLink[];
	ratings: EntryRating[];
	platforms: Platform[];
}

// ----

export interface IssueStats {
	entries: number;
	compoEntries: number;
	jamEntries: number;
	ratingDistribution: { [area: string]: number; };
}

// ----

export interface Catalog {
	stats: IssueStats;
	entries: Entry[];
}
