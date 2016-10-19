// spiderutil - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as mkdirp from "mkdirp";

export function catalogIndexPath(issue: number) {
	return `../spider_data/catalogs/catalog_${issue}.json`;
}

export function entryPagesDirPath(issue: number) {
	return `../spider_data/entry_pages/entries_${issue}/`;
}

export function entryPageFilePath(issue: number, uid: number) {
	return `${entryPagesDirPath(issue)}entry_${uid}.html`;
}

export function entriesCatalogPath(issue: number) {
	return `../site/data/ld${issue}_entries.json`;
}

export function gzippedEntriesCatalogPath(issue: number) {
	return `../site/data/ld${issue}_entries.gzjson`;
}


export function issueBaseURL(issue: number) {
	return `http://ludumdare.com/compo/ludum-dare-${issue}/`;
}

export function ensureDirectory(dir: string) {
	return new Promise((resolve, reject) => {
		mkdirp(dir, err => {
			if (err) {
				reject(err);
			}
			else {
				resolve();
			}
		});
	});
}
