// extractor - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as jsdom from "jsdom";

import { Platform, EntryListing, Catalog, Entry } from "../lib/catalog";
import { listingPath, issueBaseURL, entryPageFilePath, entriesCatalogPath } from "./importutil";


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


// only and required input arg is the LD issue
let LDIssue = 0;
if (process.argv.length === 3) {
	LDIssue = parseInt(process.argv[2]);
	if (isNaN(LDIssue) || LDIssue < 15 || LDIssue > 99) {
		LDIssue = 0;
	}
}
if (LDIssue === 0) {
	console.info("Expected LD issue counter as sole arg (15 < issue < 99)");
	process.exit(1);
}

function extractEntryFromPage(link: string, thumb: string) {
	const uid = parseInt(link.substr(link.indexOf("uid=") + 4));

	return entryDoc(LDIssue, uid)
		.then(doc => {
			return createEntry(link, LDIssue, uid, thumb, doc);
		});
}


function completed(entries: Catalog) {
	console.info(`Extraction complete, writing ${entries.length} entries to catalog file...`);
	const catalogJSON = JSON.stringify(entries);
	fs.writeFile(entriesCatalogPath(LDIssue), catalogJSON, (err) => {
		if (err) {
			console.info("Could not write catalog file: ", err);
		}
		else {
			console.info("Done");
		}
	});
}

// Good thing this is all single-threaded so this hackery actually works.

const MAX_INFLIGHT = 10;
const inFlight: Promise<Entry>[] = [];
var isDone = false;

function tryNext(source: EntryListing, catalog: Catalog) {
	const checkDone = function() {
		if (isDone) {
			return true;
		}
		isDone = (source.links.length === 0 && inFlight.length === 0);
		if (isDone) {
			completed(catalog);
		}
		return isDone;
	};
	if (checkDone()) {
		return;
	}

	if (source.links.length > 0 && inFlight.length < MAX_INFLIGHT) {
		const link = source.links.shift()!;
		const thumb = source.thumbs.shift()!;

		const unqueueSelf = function(prom: Promise<Entry>) {
			const promIx = inFlight.indexOf(prom);
			if (promIx < 0) {
				console.error("Can't find myself in the inFlight array!", inFlight, prom);
				process.abort();
			}
			inFlight.splice(promIx, 1);
			checkDone();
		};

		const p = extractEntryFromPage(link, thumb)
			.then(entry => {
				catalog.push(entry);

				const totalCount = source.links.length + catalog.length;
				if (catalog.length % 10 === 0) {
					console.info((100 * (catalog.length / totalCount)).toFixed(1) + "%");
				}

				unqueueSelf(p);
			})
			.catch(err => {
				console.info(`ERROR for ${link}: `, err);
				unqueueSelf(p);
			});

		inFlight.push(p);
	}

	setTimeout(function() { tryNext(source, catalog); }, 1);
}

loadCatalog(LDIssue).then(catalogIndex => {
	tryNext(catalogIndex, []);
});
