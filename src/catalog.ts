// catalog.ts

import { loadTypedJSON } from "util";

export module catalog {

	const FILE_PATH = location.host.toLowerCase() !== "zenmumbler.net" ? "data/ld35-entries.json" : "data/ld35-entries.gzjson";

	export const enum EntryFeatures {
		Win = 1,
		Mac = 2,
		Linux = 4,
		HTML5 = 8,
		WebGL = 16,
		Unity = 32,
		Java = 64,
		Love = 128,
		Flash = 256,
		VR = 512,
		Mobile = 1024,
		Source = 2048
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
