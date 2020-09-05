// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-Present by @zenmumbler

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

export interface IssueInfo {
	issue: number;
	year: number;
	theme: string;
	apiFeedID: number;
}

export const IssueData: { readonly [issue: number]: IssueInfo } = {
	15: { issue: 15, year: 2009, theme: "Caverns", apiFeedID: 0 },
	16: { issue: 16, year: 2009, theme: "Exploration", apiFeedID: 0 },

	17: { issue: 17, year: 2010, theme: "Islands", apiFeedID: 0 },
	18: { issue: 18, year: 2010, theme: "Enemies as Weapons", apiFeedID: 0 },
	19: { issue: 19, year: 2010, theme: "Discovery", apiFeedID: 0 },

	20: { issue: 20, year: 2011, theme: "It’s Dangerous to go Alone! Take this!", apiFeedID: 0 },
	21: { issue: 21, year: 2011, theme: "Escape", apiFeedID: 0 },
	22: { issue: 22, year: 2011, theme: "Alone", apiFeedID: 0 },
	
	23: { issue: 23, year: 2012, theme: "Tiny World", apiFeedID: 0 },
	24: { issue: 24, year: 2012, theme: "Evolution", apiFeedID: 0 },
	25: { issue: 25, year: 2012, theme: "You are the Villain", apiFeedID: 0 },

	26: { issue: 26, year: 2013, theme: "Minimalism", apiFeedID: 0 },
	27: { issue: 27, year: 2013, theme: "10 Seconds", apiFeedID: 0 },
	28: { issue: 28, year: 2013, theme: "You Only Get One", apiFeedID: 0 },

	29: { issue: 29, year: 2014, theme: "Beneath the Surface", apiFeedID: 0 },
	30: { issue: 30, year: 2014, theme: "Connected Worlds", apiFeedID: 0 },
	31: { issue: 31, year: 2014, theme: "Entire Game on One Screen", apiFeedID: 0 },

	32: { issue: 32, year: 2015, theme: "An Unconventional Weapon", apiFeedID: 0 },
	33: { issue: 33, year: 2015, theme: "You are the Monster", apiFeedID: 0 },
	34: { issue: 34, year: 2015, theme: "Two Button Controls, Growing", apiFeedID: 0 },

	35: { issue: 35, year: 2016, theme: "Shapeshift", apiFeedID: 0 },
	36: { issue: 36, year: 2016, theme: "Ancient Technology", apiFeedID: 0 },
	37: { issue: 37, year: 2016, theme: "One Room", apiFeedID: 0 },

	38: { issue: 38, year: 2017, theme: "A Small World", apiFeedID: 9405 },
	39: { issue: 39, year: 2017, theme: "Running out of Power", apiFeedID: 32802 },
	40: { issue: 40, year: 2017, theme: "The more you have, the worse it is", apiFeedID: 49883 },

	41: { issue: 41, year: 2018, theme: "Two Incompatible Genres", apiFeedID: 73256 },
	42: { issue: 42, year: 2018, theme: "Running out of Space", apiFeedID: 97793 },
	43: { issue: 43, year: 2018, theme: "Sacrifices must be made", apiFeedID: 120415 },

	44: { issue: 44, year: 2019, theme: "Your life is currency", apiFeedID: 139254 },
	45: { issue: 45, year: 2019, theme: "Start with nothing", apiFeedID: 159347 },

	46: { issue: 46, year: 2020, theme: "Keep it alive", apiFeedID: 176557 },
};

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

export function mediaURL(relPath: string) {
	if (location.hostname === "localhost") {
		return `data/${relPath}`;
	}
	return `https://f003.backblazeb2.com/file/dtbbmedia/${relPath}`;
}

export function mediaThumbURL(issue: number, ldThumbURL: string) {
	const fileName = ldThumbURL.split("/").splice(-1);
	return mediaURL(`thumbs/${issue}/${fileName}`);
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

export interface CatalogHeader {
	issue: number;
	theme: string;
	stats: IssueStats;
	savedAt?: Date;
}

export interface Catalog extends CatalogHeader {
	entries: Entry[];
}

// ----

export interface EntryIndexes {
	platformMask: number;
}

export interface IndexedEntry extends Entry {
	docID: number;
	indexes: EntryIndexes;
}


// ----

export interface ManifestEntry {
	issue: number;
	updatedAt: Date;
}

export interface Manifest {
	issues: ManifestEntry[];
}
