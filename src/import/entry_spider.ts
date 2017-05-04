// entry_spider - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import request from "request";

import { EntryListing } from "../lib/catalog";
import { ensureDirectory, issueBaseURL, listingPath, entryPagesDirPath, entryPageFilePath, userJSONFilePath, timeoutPromise } from "./importutil";

const DELAY_BETWEEN_REQUESTS_MS = 50;

interface EntrySpiderState {
	issue: number;
	index: number;
	urlList: string[];
	entriesWritten: number;
	failures: number;
}

interface APIMinimal {
	node: {
		id: number;
		type: "item" | "user";
		path: string;
		name: string;
		meta: {
			avatar?: string;
		}
	}[];
}

function load(state: EntrySpiderState) {
	if (state.index >= state.urlList.length) {
		console.info(`Done (wrote ${state.entriesWritten} entries, ${state.failures} failures)`);
		return Promise.resolve();
	}

	const link = state.urlList[state.index];
	let gid: number;
	if (state.issue <= 37) {
		gid = parseInt(link.substr(link.indexOf("uid=") + 4));
	}
	else {
		gid = parseInt(link.substr(link.lastIndexOf("/") + 1));
	}
	const filePath = entryPageFilePath(state.issue, gid);

	const next = (overrideDelay?: number): Promise<void> => {
		if (state.index % 10 === 0) {
			console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
		}
		state.index += 1;

		return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS)
			.then(_ => load(state));
	};

	if (fs.existsSync(filePath)) {
		return next(1);
	}
	else {
		return new Promise<void>(resolve => {
			request(
				{
					url: link,
					timeout: 3000
				},
				(error, response, body) => {
					if (!error && response.statusCode === 200) {
						const json = JSON.parse(body) as APIMinimal;
						fs.writeFile(filePath, body, (err) => {
							if (err) {
								console.info(`Failed to write file for gid: ${gid}`, err);
								state.failures += 1;
							}
							else {
								state.entriesWritten += 1;
							}
							resolve(next());
						});
					}
					else {
						console.info(`Failed to load entry page for gid: ${gid}`, error, response ? response.statusCode : "-");
						state.failures += 1;
						resolve(next());
					}
				}
			);
		});
	}
}


export function fetchEntryPages(issue: number) {
	if (isNaN(issue) || issue < 15 || issue > 99) {
		return Promise.reject("issue must be (15 <= issue <= 99)");
	}

	console.info(`Fetching entry pages for issue ${issue}`);

	return new Promise<void>((resolve, reject) => {
		fs.readFile(listingPath(issue), "utf8", (listingErr, data) => {
			if (listingErr) {
				reject(`Could not load listing for issue ${issue}: ${listingErr}`);
				return;
			}

			resolve(ensureDirectory(entryPagesDirPath(issue))
				.then(() => {
					const json = JSON.parse(data) as EntryListing;

					let links: string[];
					const baseURL = issueBaseURL(issue);
					if (issue <= 37) {
						links = json.links.map(u => baseURL + u);
					}
					else {
						links = json.links.map(id => `${baseURL}/get/${id}`);
					}
					return load({
						issue,
						index: 0,
						urlList: links,
						entriesWritten: 0,
						failures: 0
					});
				})
				.catch(dirErr => {
					reject(`Could not create entries directory: ${dirErr}`);
				})
			);
		});
	});
}
