// catalog.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { loadTypedJSON } from "util";

export module catalog {

	const FILE_REVISION = 2;
	const FILE_PATH = location.host.toLowerCase() !== "zenmumbler.net" ? `data/ld35-entries-${FILE_REVISION}.json` : `data/ld35-entries-${FILE_REVISION}.gzjson`; // `

	export const enum EntryFeatures {
		App = 1,
		Win = 2,
		Mac = 4,
		Linux = 8,
		Web = 16,
		Java = 32,
		VR = 64,
		Mobile = 128,

		Last = 128
	}

	export interface Entry {
		title: string;
		category: "compo" | "jam";
		description: string;
		thumbnail_url: string;
		entry_url: string;

		author: {
			name: string;
			uid: number;
			avatar_url: string;
			author_home_url: string;
		}

		screens: {
			thumbnail_url: string;
			full_url: string;
		}[];

		links: {
			title: string;
			url: string;
		}[];

		features: EntryFeatures;
	}

	export type Catalog = Entry[];

	export function load() {
		return loadTypedJSON<Catalog>(FILE_PATH);
	}
}
