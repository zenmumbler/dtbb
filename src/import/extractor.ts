// extractor - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as jsdom from "jsdom";

import { EntryListing, Entry, Catalog, EntryRating, RatingArea, IssueStats, IssueThemeNames } from "../lib/catalog";
import { listingPath, issueBaseURL, entryPageFilePath, entriesCatalogPath, timeoutPromise } from "./importutil";
import { arrayFromSet } from "../lib/setutil";
import { detectPlatforms } from "./detect_platform";


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


function extractRatings(table: HTMLTableElement): EntryRating[] {
	const ratings: EntryRating[] = [];
	if (table) {
		const trs = [].slice.call(table.querySelectorAll("tr")) as HTMLTableRowElement[];
		for (const row of trs) {
			const tds = row.querySelectorAll("td");
			if (tds.length !== 3) {
				console.info("weird rating table found");
				break;
			}

			// rank
			let rank = -1;
			const rankString = tds[0].innerHTML.trim();
			const simpleRank = rankString.match(/#(\d+)/);
			if (simpleRank) {
				rank = parseInt(simpleRank[1]);
			}
			else if (rankString.indexOf("ibronze") > -1) {
				rank = 3;
			}
			else if (rankString.indexOf("isilver") > -1) {
				rank = 2;
			}
			else if (rankString.indexOf("igold") > -1) {
				rank = 1;
			}

			// area
			let area = (tds[1].innerHTML.trim().toLowerCase().replace("(jam)", "")) as RatingArea;

			// score
			let score = parseFloat(tds[2].innerHTML.trim());

			if (rank > -1 && area.length > 0 && !isNaN(score)) {
				ratings.push({ area, rank, score });
			}
		}
	}
	return ratings;
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
	const ratingTable = base.querySelector("table");

	const categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");

	const entry: Entry = {
		ld_issue: issue,

		title: titleElem.textContent || "<no title>",
		category: categoryStr.indexOf("jam") > -1 ? "jam" : "compo",
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
					label: link.textContent || "",
					url: link.getAttribute("href")!
				};
			}),

		ratings: extractRatings(ratingTable),
		platforms: []
	};

	entry.platforms = arrayFromSet(detectPlatforms(entry));

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
	stats: IssueStats;
	entries: Entry[];
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

	console.info(`Extraction complete, writing ${state.entries.length} entries to catalog file...`);
	const catalog: Catalog = {
		issue: state.issue,
		theme: IssueThemeNames[state.issue],
		stats: state.stats,
		entries: state.entries
	};
	const catalogJSON = JSON.stringify(catalog);

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


function updateStats(stats: IssueStats, entry: Entry) {
	stats.entries += 1;
	if (entry.category === "compo") {
		stats.compoEntries += 1;
	}
	else {
		stats.jamEntries += 1;
	}

	for (const rating of entry.ratings) {
		if (rating.area in stats.ratingDistribution) {
			stats.ratingDistribution[rating.area] += 1;
		}
		else {
			stats.ratingDistribution[rating.area] = 1;
		}
	}
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
				state.entries.push(entry);
				updateStats(state.stats, entry);

				const totalCount = state.source.links.length + state.entries.length;
				if (state.entries.length % 10 === 0) {
					console.info((100 * (state.entries.length / totalCount)).toFixed(1) + "%");
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
			stats: {
				entries: 0,
				compoEntries: 0,
				jamEntries: 0,
				ratingDistribution: {}
			},
			entries: []
		});
	});
}
