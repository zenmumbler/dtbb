// entry_spider - part of dtbb
// (c) 2016-Present by @zenmumbler

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
	authorIDs: Set<number>;
}

interface APIMinimal {
	node: {
		id: number;
		// author: number;
		subsubtype: string;
		meta: {
			author: number[];
		}
	}[];
}

function load(state: EntrySpiderState) {
	if (state.index >= state.urlList.length) {
		console.info(`Done (wrote ${state.entriesWritten} entries, ${state.failures} failures)`);
		return Promise.resolve();
	}

	const [linkType, link] = state.urlList[state.index].split("|");

	let gid: number;
	if (state.issue <= 37) {
		if (linkType !== "E") {
			throw new Error("Can only handle entry links in LD <= 37");
		}
		gid = parseInt(link.substr(link.indexOf("uid=") + 4));
	}
	else {
		gid = parseInt(link.substr(link.lastIndexOf("/") + 1));
	}
	const filePath = linkType === "E" ? entryPageFilePath(state.issue, gid) : userJSONFilePath(state.issue, gid);

	const next = (overrideDelay?: number): Promise<void> => {
		if (state.index % 10 === 0) {
			console.info((100 * (state.index / state.urlList.length)).toFixed(1) + `% (${state.index}/${state.urlList.length})`);
		}
		state.index += 1;

		return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS)
			.then(_ => load(state));
	};

	if (fs.existsSync(filePath)) {
		if (linkType === "E") {
			return new Promise<void>(resolve => {
				fs.readFile(filePath, "utf8", (err, data) => {
					if (err) {
						state.urlList.push(`E|${issueBaseURL(state.issue)}/get/${gid}`);
					}
					else {
						const json = JSON.parse(data) as APIMinimal;
						if (json.node[0] && json.node[0].meta) {
							for (const author of json.node[0].meta.author) {
								if (! state.authorIDs.has(author)) {
									state.authorIDs.add(author);
									state.urlList.push(`U|${issueBaseURL(state.issue)}/get/${author}`);
								}
							}
						}
					}
					resolve(next(1));
				});
			});
		}

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
						if (linkType === "E" && state.issue >= 38) {
							const json = JSON.parse(body) as APIMinimal;
							if (json && json.node && json.node[0] && json.node[0].meta) {
								for (const author of json.node[0].meta.author) {
									if (! state.authorIDs.has(author)) {
										state.authorIDs.add(author);
										state.urlList.push(`U|${issueBaseURL(state.issue)}/get/${author}`);
									}
								}
							}
						}

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
						links = json.links.map(u => `E|${baseURL}${u}`);
					}
					else {
						links = json.links.map(id => `E|${baseURL}/get/${id}`);
					}
					return load({
						issue,
						index: 0,
						urlList: links,
						entriesWritten: 0,
						failures: 0,
						authorIDs: new Set()
					});
				})
				.catch(dirErr => {
					reject(`Could not create entries directory: ${dirErr}`);
				})
			);
		});
	});
}
