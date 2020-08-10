// index_spider - part of dtbb
// (c) 2016-Present by @zenmumbler

import * as fs from "fs";
import got from "got";

import { ensureDirectory, listingDirPath, listingPath, issueIndexPageURL, timeoutPromise } from "./importutil";

const LD_PAGE_SIZE = 24;
const LD_NEW_PAGE_SIZE = 100;
const DELAY_BETWEEN_REQUESTS_MS = 20;

interface SpiderState {
	issue: number;
	offset: number;
	allLinks: string[];
	allThumbs: string[];
}

function processBody(state: SpiderState, body: string): boolean {
	const links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
	const thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);

	if (links && thumbs) {
		if (links.length === thumbs.length + 1) {
			links.shift(); // remove hidden "edit self" link
		}

		if (links.length === thumbs.length) {
			state.allLinks = state.allLinks.concat(links);
			state.allThumbs = state.allThumbs.concat(thumbs);
		}
		else {
			throw new Error(`mismatch of link and thumb count (${links.length} vs ${thumbs.length}) at offset ${state.offset}`);
		}

		return false;
	}

	return true;
}

interface APIListing {
	status: number;
	feed: {
		id: number;
		modified: string;
	}[];
}

function processBodyNew(state: SpiderState, body: string): boolean {
	const listingJSON = JSON.parse(body) as APIListing;

	if (listingJSON && listingJSON.status === 200 && listingJSON.feed) {
		const ids = listingJSON.feed.map(g => "" + g.id);
		state.allLinks = state.allLinks.concat(ids);
		if (ids.length < listingJSON.feed.length) {
			console.info(`skipping ${listingJSON.feed.length - ids.length} entries from older LD.`);
		}

		return listingJSON.feed.length === 0;
	}
	else {
		throw new Error(`Something wrong with the feed at offset ${state.offset}`);
	}
}

function next(state: SpiderState): Promise<void> {
	const processFn = (state.issue <= 37) ? processBody : processBodyNew;
	const pageSize = (state.issue <= 37) ? LD_PAGE_SIZE : LD_NEW_PAGE_SIZE;

	return got(`${issueIndexPageURL(state.issue, state.offset, pageSize)}`)
	.then(
		(response) => {
			let completed = processFn(state, response.body);

			if (! completed) {
				state.offset += pageSize;
				console.info(`fetched ${state.allLinks.length} records...`);
				return timeoutPromise(DELAY_BETWEEN_REQUESTS_MS).then(_ => next(state));
			}
			else {
				console.info(`Writing listing (${state.allLinks.length} entries)...`);
				const listingJSON = JSON.stringify({ links: state.allLinks, thumbs: state.allThumbs });

				return ensureDirectory(listingDirPath()).then(() => {
					return fs.promises.writeFile(listingPath(state.issue), listingJSON)
					.then(
						() => {
							console.info("Done.");
						},
						err => {
							console.error("Failed to write listing file", err);
						}
					);
				});
			}
		},
		(error) => {
			throw new Error(`Failed to get page for offset ${state.offset}, error: ${error}`);
		}
	);
}

export function fetchListing(issue: number) {
	if (isNaN(issue) || issue < 15 || issue > 99) {
		return Promise.reject("issue must be (15 <= issue <= 99)");
	}

	console.info(`Fetching listing for issue ${issue}`);

	return next({
		issue,
		offset: 0,
		allLinks: [],
		allThumbs: []
	});
}
