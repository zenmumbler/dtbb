// extractor - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as jsdom from "jsdom";

import { Platform, EntryListing, Entry } from "../lib/catalog";
import { listingPath, issueBaseURL, entryPageFilePath, entriesCatalogPath, timeoutPromise } from "./importutil";


function entryDoc(issue: number, uid: number): Promise<Document> {
	return new Promise<Document>(
		(resolve, reject) => {
			jsdom.env(entryPageFilePath(issue, uid), (errors: Error[], window: Window) => {
				if (errors && errors.length) {
					reject(errors);
				}
				else {
					resolve(window.document);
				}
			});
		}
	);
}


function loadCatalog(issue: number): Promise<EntryListing> {
	return new Promise((resolve, reject) => {
		fs.readFile(listingPath(issue), "utf8", (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				const listingJSON = JSON.parse(data) as EntryListing;
				resolve(listingJSON);
			}
		});
	});
}


function createEntry(relURI: string, issue: number, uid: number, thumbImg: string, doc: Document): Entry {
	const ldBaseURL = "http://ludumdare.com/compo/";
	const eventBaseURL = issueBaseURL(issue);

	const base = doc.querySelector("#compo2");
	if (! base) {
		throw new Error(`no base element in page of uid: ${uid}`);
	}

	const titleElem = base.querySelector("h2");
	const avatarImg = base.querySelector("img.avatar") as HTMLImageElement;
	const authorLink = titleElem.parentElement.querySelector("a");
	const categoryText = titleElem.parentElement.querySelector("i").textContent || "";
	const authorName = authorLink.querySelector("strong").textContent || "";
	const screensArrayElem = base.querySelector(".shot-nav");
	const screensArray = [].slice.call(screensArrayElem.querySelectorAll("img")) as HTMLImageElement[];
	const linksArray = [].slice.call(base.querySelectorAll(".links a")) as HTMLAnchorElement[];
	const description = screensArrayElem.nextSibling.textContent || "";

	const categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");

	const entry: Entry = {
		ld_issue: issue,

		title: titleElem.textContent || "<no title>",
		category: categoryStr === "compo" ? "compo" : "jam",
		description: description,

		thumbnail_url: thumbImg,
		entry_url: eventBaseURL + relURI,

		author: {
			name: authorName,
			uid: uid,
			avatar_url: avatarImg.src,
			home_url: ldBaseURL + authorLink.getAttribute("href")!.substr(3)
		},

		screens: screensArray.map(
			screen => {
				const imgoc = screen.getAttribute("onclick");
				const urls = { thumbnail_url: "", full_url: "" };
				if (imgoc) {
					urls.thumbnail_url = screen.src.replace(/compo2\/\//g, "compo2/");
					urls.full_url = imgoc.substring(imgoc.lastIndexOf("http://"), imgoc.indexOf('")'));
				}
				return urls;
			})
			.filter(s => s.full_url.length > 0),

		links: linksArray.map(
			link => {
				return {
					title: link.textContent || "",
					url: link.getAttribute("href")!
				};
			}),

		platform: Platform.None
	};

	return entry;
}


// ------------


const MAX_INFLIGHT = 10;

interface ExtractState {
	issue: number;
	done: boolean;
	completionPromise?: Promise<void>;
	inFlight: Promise<Entry>[];
	source: EntryListing;
	catalog: Entry[];
}


function extractEntryFromPage(state: ExtractState, link: string, thumb: string) {
	const uid = parseInt(link.substr(link.indexOf("uid=") + 4));

	return entryDoc(state.issue, uid)
		.then(doc => {
			return createEntry(link, state.issue, uid, thumb, doc);
		});
}


// Good thing this is all single-threaded so this hackery actually works.

function completed(state: ExtractState) {
	if (state.completionPromise) {
		return state.completionPromise;
	}

	console.info(`Extraction complete, writing ${state.catalog.length} entries to catalog file...`);
	const catalogJSON = JSON.stringify(state.catalog);

	state.completionPromise = new Promise<void>((resolve, reject) => {
		fs.writeFile(entriesCatalogPath(state.issue), catalogJSON, (err) => {
			if (err) {
				console.info("Could not write catalog file: ", err);
				reject(err);
			}
			else {
				console.info("Done");
				resolve();
			}
		});
	});

	return state.completionPromise;
}


function tryNext(state: ExtractState): Promise<void> {
	const checkDone = function() {
		if (state.done) {
			return true;
		}
		state.done = (state.source.links.length === 0 && state.inFlight.length === 0);
		return state.done;
	};
	if (checkDone()) {
		return completed(state);
	}

	if (state.source.links.length > 0 && state.inFlight.length < MAX_INFLIGHT) {
		const link = state.source.links.shift()!;
		const thumb = state.source.thumbs.shift()!;

		const unqueueSelf = function(prom: Promise<Entry>) {
			const promIx = state.inFlight.indexOf(prom);
			if (promIx < 0) {
				console.error("Can't find myself in the inFlight array!", state.inFlight, prom);
				return Promise.reject("internal inconsistency error");
			}
			state.inFlight.splice(promIx, 1);
			if (checkDone()) {
				return completed(state);
			}
			else {
				return Promise.resolve();
			}
		};

		const p: Promise<void> = extractEntryFromPage(state, link, thumb)
			.then(entry => {
				state.catalog.push(entry);

				const totalCount = state.source.links.length + state.catalog.length;
				if (state.catalog.length % 10 === 0) {
					console.info((100 * (state.catalog.length / totalCount)).toFixed(1) + "%");
				}

				return unqueueSelf(p);
			})
			.catch(err => {
				console.info(`ERROR for ${link}: `, err);
				return unqueueSelf(p);
			});

		state.inFlight.push(p);
	}

	return timeoutPromise(1).then(() => tryNext(state));
}


export function extractEntries(issue: number) {
	if (isNaN(issue) || issue < 15 || issue > 99) {
		return Promise.reject("issue must be (15 <= issue <= 99)");
	}

	console.info(`Extracting entry records for issue ${issue}`);

	return loadCatalog(issue).then(catalogIndex => {
		return tryNext({
			issue,
			done: false,
			inFlight: [],
			source: catalogIndex,
			catalog: []
		});
	});
}
