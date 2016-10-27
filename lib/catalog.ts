// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export interface EntryListing {
	links: string[];
	thumbs: string[];
}

// ----

export type PlatformKey = "desktop" | "win" | "mac" | "linux" | "web" | "java" | "vr" | "mobile";

export interface Platform {
	key: PlatformKey;
	label: string;
	mask: number;
}

export interface PlatformLookup {
	readonly [key: string]: Platform;
}

interface PlatformDesc {
	key: PlatformKey;
	label: string;
}

function makePlatformLookup(plats: PlatformDesc[]): PlatformLookup {
	const pl: { [key: string]: Platform } = {};
	let shift = 0;

	for (const p of plats) {
		pl[p.key] = {
			key: p.key,
			label: p.label,
			mask: 1 << shift
		};
		shift += 1;
	}

	return pl;
}

export const Platforms = makePlatformLookup([
	{ key: "desktop", label: "Desktop" },
	{ key: "win", label: "Windows" },
	{ key: "mac", label: "MacOS" },
	{ key: "linux", label: "Linux" },
	{ key: "web", label: "Web" },
	{ key: "java", label: "Java" },
	{ key: "vr", label: "VR" },
	{ key: "mobile", label: "Mobile" },
]);


export function maskForPlatformKeys(keys: PlatformKey[]) {
	return keys.reduce((mask, key) => {
		const plat = Platforms[key];
		return mask | (plat ? plat.mask : 0);
	}, 0);
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
	platforms: PlatformKey[];
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
