// import entry script - part of dtbb import
// by Arthur Langereis - @zenmumbler

import { fetchListing } from "./index_spider";
import { fetchEntryPages } from "./entry_spider";
import { fetchThumbs } from "./thumb_spider";
import { extractEntries } from "./extractor";
import { task, runt } from "./runt";

const MIN_ISSUE = 15;
const MAX_ISSUE = 39;

interface IssueRange {
	from: number;
	to: number;
}

function getIssueRange(issueSA?: string, issueSB?: string): IssueRange | undefined {
	const issueFrom = issueSA === undefined ? 0 : parseInt(issueSA);
	const issueTo = issueSB === undefined ? issueFrom : parseInt(issueSB);

	if (isNaN(issueFrom) || issueFrom < MIN_ISSUE || issueFrom > MAX_ISSUE || issueTo < issueFrom || issueTo > MAX_ISSUE) {
		console.info(`usage: ${process.argv[2]} <issueFrom: ${MIN_ISSUE}..${MAX_ISSUE}> [<issueTo: ${MIN_ISSUE}..${MAX_ISSUE}>]`);
		return undefined;
	}

	return {
		from: issueFrom,
		to: issueTo
	};
}

function rangedTaskPerIssue(f: string, t: string, sitFn: (issue: number) => Promise<void>) {
	const range = getIssueRange(f, t);
	if (range) {
		let issue = range.from - 1;
		const next = function(): Promise<void> {
			issue += 1;
			if (issue <= range.to) {
				return sitFn(issue).then(next);
			}
			else {
				return Promise.resolve();
			}
		};
		return next();
	}
	else {
		return Promise.resolve();
	}
}

task("listing", function(f: string, t: string) {
	return rangedTaskPerIssue(f, t, fetchListing);
});

task("entries", function(f: string, t: string) {
	return rangedTaskPerIssue(f, t, fetchEntryPages);
});

task("thumbs", function(f: string, t: string) {
	return rangedTaskPerIssue(f, t, fetchThumbs);
});

task("extract", function(f: string, t: string) {
	return rangedTaskPerIssue(f, t, extractEntries);
});

runt();
