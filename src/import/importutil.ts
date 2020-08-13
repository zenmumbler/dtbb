// importutil - part of dtbb
// (c) 2016-Present by @zenmumbler

import mkdirp from "mkdirp";
import { IssueData } from "../lib/catalog";

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
		return `https://api.ldjam.com/vx/node/`;
	}
}

export function issueIndexPageURL(issue: number, offset: number, limit: number) {
	if (issue <= 37) {
		return `${issueBaseURL(issue)}?action=preview&start=${offset}`; // itemCount is fixed at 24
	}
	else {
		const feed = IssueData[issue].apiFeedID;
		return `${issueBaseURL(issue)}feed/${feed}/grade-01-result+reverse+parent/item/game/compo+jam?offset=${offset}&limit=${limit}`;
	}
}


export function ensureDirectory(dir: string) {
	return mkdirp(dir);
}

export function timeoutPromise(delayMS: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, delayMS);
	});
}
