// importutil - part of dtbb
// by Arthur Langereis - @zenmumbler

import mkdirp from "mkdirp";

export function listingDirPath() {
	return `./spider_data/listings/`;
}

export function listingPath(issue: number) {
	return `${listingDirPath()}listing_${issue}.json`;
}

export function thumbsDirPath(issue: number) {
	return `../site/data/thumbs/${issue}/`;
}

export function localThumbPathForLDURL(issue: number, ldThumb: string) {
	const fileName = ldThumb.split("/").splice(-1);
	return thumbsDirPath(issue) + fileName;
}

export function entryPagesDirPath(issue: number) {
	return `./spider_data/entry_pages/entries_${issue}/`;
}
export function entryPageFilePath(issue: number, uid: number) {
	const ext = issue <= 37 ? "html" : "json";
	return `${entryPagesDirPath(issue)}entry_${uid}.${ext}`;
}
export function userJSONFilePath(issue: number, uid: number) {
	return `${entryPagesDirPath(issue)}user_${uid}.json`;
}

export function entriesCatalogPath(issue: number) {
	return `../site/data/ld${issue}_entries.json`;
}

// -- LD site URLs (old and new)

export function issueBaseURL(issue: number) {
	if (issue <= 37) {
		return `http://ludumdare.com/compo/ludum-dare-${issue}/`;
	}
	else {
		return `https://api.ldjam.com/vx/node/`; // issue does not seem to factor into the new API yet
	}
}

export function issueIndexPageURL(issue: number, offset: number) {
	if (issue <= 37) {
		return `${issueBaseURL(issue)}/?action=preview&start=${offset}`; // itemCount is fixed at 24
	}
	else {
		return `${issueBaseURL(issue)}/feed/1/all/item/game?offset=${offset}}&limit=24`;
	}
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

export function timeoutPromise(delayMS: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, delayMS);
	});
}
