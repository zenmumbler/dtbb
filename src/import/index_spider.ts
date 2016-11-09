// index_spider - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as http from "http";
import request from "./request";

import { ensureDirectory, listingDirPath, listingPath, issueBaseURL, timeoutPromise } from "./importutil";

const LD_PAGE_SIZE = 24;
const DELAY_BETWEEN_REQUESTS_MS = 20;

interface SpiderState {
	issue: number;
	offset: number;
	allLinks: string[];
	allThumbs: string[];
}

function next(state: SpiderState) {
	return new Promise((resolve, reject) => {
		request(
			`${issueBaseURL(state.issue)}/?action=preview&start=${state.offset}`,
			(error: any, response: http.IncomingMessage, body: string) => {
				let completed = false;

				if (!error && response.statusCode === 200) {
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
							reject(`mismatch of link and thumb count (${links.length} vs ${thumbs.length}) at offset ${state.offset}`);
							return;
						}
					}
					else {
						completed = true;
					}
				}
				else {
					reject(`Failed to get page for offset ${state.offset}, status: ${response.statusCode}, error: ${error}`);
					return;
				}

				if (! completed) {
					state.offset += LD_PAGE_SIZE;
					console.info(`fetched ${state.allLinks.length} records...`);
					resolve(timeoutPromise(DELAY_BETWEEN_REQUESTS_MS).then(_ => next(state)));
				}
				else {
					console.info(`Writing listing (${state.allLinks.length} entries)...`);
					const listingJSON = JSON.stringify({ links: state.allLinks, thumbs: state.allThumbs });

					ensureDirectory(listingDirPath()).then(() => {
						fs.writeFile(listingPath(state.issue), listingJSON, (err) => {
							if (err) {
								console.error("Failed to write listing file", err);
							}
							else {
								console.info("Done.");
								resolve();
							}
						});
					});
				}
			}
		);
	});
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
