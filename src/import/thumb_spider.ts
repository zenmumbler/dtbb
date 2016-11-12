// thumb_spider - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import request from "request";

import { EntryListing } from "../lib/catalog";
import { ensureDirectory, listingPath, thumbsDirPath, localThumbPathForLDURL, timeoutPromise } from "./importutil";

const DELAY_BETWEEN_REQUESTS_MS = 10;

interface ThumbSpiderState {
	issue: number;
	index: number;
	urlList: string[];
	thumbsWritten: number;
	failures: number;
}


function load(state: ThumbSpiderState) {
	if (state.index >= state.urlList.length) {
		console.info(`Done (wrote ${state.thumbsWritten} thumbs, ${state.failures} failures)`);
		return Promise.resolve();
	}

	const url = state.urlList[state.index];
	const localPath = localThumbPathForLDURL(state.issue, url);

	const next = (overrideDelay?: number): Promise<void> => {
		if (state.index % 10 === 0) {
			console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
		}
		state.index += 1;

		return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS)
			.then(_ => load(state));
	};

	if (fs.existsSync(localPath)) {
		return next(1);
	}
	else {
		return new Promise<void>(resolve => {
			request(
				{
					url: url,
					encoding: null,
					timeout: 3000
				},
				(error, response, body) => {
					if (!error && response.statusCode === 200) {
						fs.writeFile(localPath, body, (err) => {
							if (err) {
								console.info(`Failed to write thumb: ${localPath}`, err);
								state.failures += 1;
							}
							else {
								state.thumbsWritten += 1;
							}
							resolve(next());
						});
					}
					else {
						console.info(`Failed to load thumb ${url}`, error, response ? response.statusCode : "-");
						state.failures += 1;
						resolve(next());
					}
				}
			);
		});
	}
}


export function fetchThumbs(issue: number) {
	if (isNaN(issue) || issue < 15 || issue > 99) {
		return Promise.reject("issue must be (15 <= issue <= 99)");
	}

	console.info(`Fetching thumbs for issue ${issue}`);

	return new Promise<void>((resolve, reject) => {
		fs.readFile(listingPath(issue), "utf8", (listingErr, data) => {
			if (listingErr) {
				reject(`Could not load listing for issue ${issue}: ${listingErr}`);
				return;
			}

			return(ensureDirectory(thumbsDirPath(issue))
				.then(() => {
					const json = JSON.parse(data) as EntryListing;
					resolve(load({
						issue,
						index: 0,
						urlList: json.thumbs,
						thumbsWritten: 0,
						failures: 0
					}));
				})
				.catch(dirErr => {
					reject(`Could not create thumbs directory: ${dirErr}`);
				})
			);
		});
	});
}
