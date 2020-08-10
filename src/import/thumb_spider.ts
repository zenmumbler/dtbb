// thumb_spider - part of dtbb
// (c) 2016-Present by @zenmumbler

import * as fs from "fs";
import got from "got";

import { EntryListing, Catalog } from "../lib/catalog";
import { ensureDirectory, listingPath, entriesCatalogPath, thumbsDirPath, localThumbPathForLDURL, timeoutPromise } from "./importutil";

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
		return got(url, { responseType: "buffer", timeout: 3000 })
			.then(
				response => {
					return fs.promises.writeFile(localPath, response.body)
					.then(
						() => {
							state.thumbsWritten += 1;
							return next();

						},
						err => {
							console.info(`Failed to write thumb: ${localPath}`, err);
							state.failures += 1;
							return next();
						}
					);
				},
				error => {
					console.info(`Failed to load thumb ${url}`, error);
					state.failures += 1;
					return next();
			}
		);
	}
}


export function fetchThumbs(issue: number) {
	if (isNaN(issue) || issue < 15 || issue > 99) {
		return Promise.reject("issue must be (15 <= issue <= 99)");
	}

	console.info(`Fetching thumbs for issue ${issue}`);

	const sourcePath = issue <= 37 ? listingPath(issue) : entriesCatalogPath(issue);

	return new Promise<void>((resolve, reject) => {
		fs.readFile(sourcePath, "utf8", (listingErr, data) => {
			if (listingErr) {
				reject(`Could not load listing/entries for issue ${issue}: ${listingErr}`);
				return;
			}

			return(ensureDirectory(thumbsDirPath(issue))
				.then(() => {
					const thumbs = issue <= 37 ?
						(JSON.parse(data) as EntryListing).thumbs :
						(JSON.parse(data) as Catalog).entries.filter(e => e.thumbnail_url.length > 0).map(e => e.thumbnail_url);

					resolve(load({
						issue,
						index: 0,
						urlList: thumbs,
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
