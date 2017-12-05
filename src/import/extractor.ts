// extractor - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import { JSDOM } from "jsdom";

import { EntryListing, Entry, Catalog, EntryRating, RatingArea, IssueStats, IssueThemeNames } from "../lib/catalog";
import { listingPath, issueBaseURL, entryPageFilePath, userJSONFilePath, entriesCatalogPath, timeoutPromise } from "./importutil";
import { arrayFromSet } from "../lib/setutil";
import { detectPlatforms } from "./detect_platform";


function entryDoc(issue: number, uid: number): Promise<Document> {
	return new Promise<Document>(
		(resolve, reject) => {
			JSDOM.fromFile(entryPageFilePath(issue, uid))
			.then((jsdom: JSDOM) => {
				resolve(jsdom.window.document);
			},
			(err) => {
				reject(err);
			});
		}
	);
}

const apiLinkTypeDescription: { [tag: string]: string | undefined } = {
	42332: "Source code",
	42336: "HTML5 web",
	42337: "Windows",
	42339: "macOS",
	42341: "Linux",
	42342: "Android",
	42346: "iOS",
	42348: "PlayStation PS1 PSX",
	42349: "PlayStation 2 PS2",
	42350: "PlayStation 3 PS3",
	42351: "PlayStation 4 PS4",
	42352: "PlayStation Portable PSP",
	42356: "PlayStation Vita PS Vita",
	42361: "Nintendo Entertainment System Famicom",
	42362: "Super Nintendo Famicom",
	42365: "Nintendo 64 N64",
	42368: "Nintendo GameCube",
	42370: "Nintendo Wii",
	42371: "Nintendo Wii U",
	42372: "Nintendo Switch",
	42374: "Nintendo GameBoy",
	42376: "GameBoy Advance",
	42377: "Nintendo DS",
	42382: "Nintendo 3DS",
	42386: "Sega Master System",
	42387: "Sega Genesis / Mega Drive",
	42389: "Sega Saturn",
	42390: "Sega Dreamcast",
	42391: "Sega Game Gear",
	42392: "Microsoft Xbox",
	42393: "Microsoft Xbox 360",
	42394: "Microsoft Xbox One",
	42398: "Commodore",
	42400: "Commodore VIC-20",
	42402: "Commodore 64",
	42403: "Commodore 128",
	42405: "Amiga",
	42407: "Atari",
	42408: "Atari 2600",
	42412: "Atari Jaguar",
	42413: "Atari ST",
	42416: "Sinclair",
	42418: "ZX Spectrum",
	42422: "Acorn",
	42424: "BBC Micro",
	42426: "Amstrad",
	42427: "Amstrad CPC",
	42429: "Sega VMU",
	42430: "Sega",
	42432: "Nintendo",
	42433: "Sony",
	42434: "Apple",
	42436: "MSX",
	42437: "Microsoft",
	42438: "Flash web",
	42439: "Java web",
	42440: "web",
	42512: "Other",
	42516: "PDF",
	42517: "Document",
};

interface APIEntry {
	status: number;
	node: {
		id: number;
		author: number;
		parent: number;
		superparent: number;
		type: "item";
		subtype: "game";
		subsubtype: "compo" | "jam" | "unfinished";
		published: string;
		created: string;
		modified: string;
		version: number;
		slug: string;
		name: string;
		body: string;
		path: string;
		love: number;
		notes: number;
		"notes-timestamp": string;
		meta: {
			"link-01"?: string,
			"link-01-tag"?: string;
			"link-02"?: string;
			"link-02-tag"?: string;
			"link-03"?: string;
			"link-03-tag"?: string;
			"link-04"?: string;
			"link-04-tag"?: string;
			"link-05"?: string;
			"link-05-tag"?: string;
			cover?: string;
		}
	}[];
}

function entryJSONDoc(issue: number, gid: number): Promise<APIEntry> {
	return new Promise((resolve, reject) => {
		fs.readFile(entryPageFilePath(issue, gid), "utf8", (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				const entryJSON = JSON.parse(data) as APIEntry;
				resolve(entryJSON);
			}
		});
	});
}

interface APIUser {
	node: {
		id: number;
		type: "user";
		path: string;
		name: string;
		meta: {
			avatar: string;
		}
	}[];
}

function userJSONDoc(issue: number, uid: number): Promise<APIUser> {
	return new Promise((resolve, reject) => {
		fs.readFile(userJSONFilePath(issue, uid), "utf8", (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(JSON.parse(data) as APIUser);
			}
		});
	});
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


function extractRatings(table: HTMLTableElement | null): EntryRating[] {
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
			const area = (tds[1].innerHTML.trim().toLowerCase().replace("(jam)", "")) as RatingArea;

			// score
			const score = parseFloat(tds[2].innerHTML.trim());

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
	const authorLink = titleElem && titleElem.parentElement!.querySelector("a");
	const categoryText = (titleElem && titleElem.parentElement!.querySelector("i")!.textContent) || "";
	const authorName = (authorLink && authorLink.querySelector("strong")!.textContent) || "";
	const screensArrayElem = base.querySelector(".shot-nav");
	const screensArray = [].slice.call((screensArrayElem && screensArrayElem.querySelectorAll("img")) || []) as HTMLImageElement[];
	const linksArray = [].slice.call(base.querySelectorAll(".links a")) as HTMLAnchorElement[];
	const description = (screensArrayElem && screensArrayElem.nextSibling && screensArrayElem.nextSibling.textContent) || "";
	const ratingTable = base.querySelector("table");

	if ([titleElem, avatarImg, authorLink, categoryText, authorName, screensArrayElem].some(t => t == null)) {
		throw new Error(`can't get all relevant elements from page source of uid ${uid}`);
	}

	const categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");

	const entry: Entry = {
		ld_issue: issue,

		title: titleElem!.textContent || "<no title>",
		category: categoryStr.indexOf("jam") > -1 ? "jam" : "compo",
		description,

		thumbnail_url: thumbImg,
		entry_url: eventBaseURL + relURI,

		author: {
			name: authorName,
			uid,
			avatar_url: avatarImg.src,
			home_url: ldBaseURL + authorLink!.getAttribute("href")!.substr(3)
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

// ----

interface MDRefs {
	images: string[];
	links: { label: string; url: string }[];
}

function resolveLDJImage(imageRef: string, thumbSize = "480x384"): { thumbnail_url: string; full_url: string; } {
	const imageRelPath = imageRef.replace("///content", "").replace("///raw", "");
	return {
		thumbnail_url: imageRelPath.length > 0 ? `https://static.jam.vg/content/${imageRelPath}.${thumbSize}.fit.jpg` : "",
		full_url: imageRelPath.length > 0 ? `https://static.jam.vg/raw/${imageRelPath}` : ""
	};
}

function extractMDRefs(text: string): MDRefs {
	const refs: MDRefs = { links: [], images: [] };
	const matcher = /\!?\[([^\]]*)\]\(([^\)]*)\)/g;
	let links: RegExpExecArray | null;
	while (links = matcher.exec(text)) { // tslint:disable-line
		if (links[0].charAt(0) === "!") {
			refs.images.push(links[2]);
		}
		else {
			refs.links.push({ label: links[1], url: links[2] });
		}
	}
	return refs;
}


function createEntryJSON(issue: number, apiEntry: APIEntry, apiUser: APIUser) {
	const doc = apiEntry.node[0];
	const author = apiUser.node[0];
	const eventBaseURL = "https://ldjam.com";

	if (doc.subsubtype === "unfinished" || doc.parent === 9405) {
		return undefined;
	}

	const refs = extractMDRefs(doc.body);
	const screens = refs.images.map(imgRef => resolveLDJImage(imgRef));

	const links = [
		{ label: doc.meta["link-01-tag"]!, url: doc.meta["link-01"]! },
		{ label: doc.meta["link-02-tag"]!, url: doc.meta["link-02"]! },
		{ label: doc.meta["link-03-tag"]!, url: doc.meta["link-03"]! },
		{ label: doc.meta["link-04-tag"]!, url: doc.meta["link-04"]! },
		{ label: doc.meta["link-05-tag"]!, url: doc.meta["link-05"]! },
	]
	.filter(l => l.url !== undefined && l.label !== undefined)
	.map(l => { l.label = apiLinkTypeDescription[l.label!] || "Other"; return l; });

	const entry: Entry = {
		ld_issue: issue,

		title: doc.name,
		category: doc.subsubtype,
		description: doc.body,

		thumbnail_url: resolveLDJImage(doc.meta.cover || "").thumbnail_url,
		entry_url: eventBaseURL + doc.path,

		author: {
			name: author.name,
			uid: author.id,
			avatar_url: resolveLDJImage(author.meta.avatar || "").full_url,
			home_url: eventBaseURL + author.path
		},

		screens,
		links,

		ratings: [],
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
	inFlight: Promise<void>[];
	source: EntryListing;
	stats: IssueStats;
	entries: Entry[];
	skippedCount: number;
}


function extractEntryFromPage(state: ExtractState, link: string, thumb: string) {
	if (state.issue <= 37) {
		const uid = parseInt(link.substr(link.indexOf("uid=") + 4));
		return entryDoc(state.issue, uid)
			.then(doc => {
				return createEntry(link, state.issue, uid, thumb, doc);
			});
	}
	else {
		const gid = parseInt(link.substr(link.lastIndexOf("/") + 1));
		return entryJSONDoc(state.issue, gid)
			.then(entry => {
				return userJSONDoc(state.issue, entry.node[0].author).then(user => ({ entry, user }));
			})
			.then(({entry, user}) => {
				return createEntryJSON(state.issue, entry, user);
			});
	}
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

		const unqueueSelf = function(prom: Promise<void>) {
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
				if (entry) {
					state.entries.push(entry);
					updateStats(state.stats, entry);
				}
				else {
					state.skippedCount += 1;
				}

				const totalCount = state.source.links.length + state.entries.length + state.skippedCount;
				const curCount = state.entries.length + state.skippedCount;
				if (curCount % 10 === 0) {
					console.info((100 * (curCount / totalCount)).toFixed(1) + "%");
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
			entries: [],
			skippedCount: 0
		});
	});
}
