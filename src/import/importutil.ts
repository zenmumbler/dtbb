// importutil - part of dtbb
// by Arthur Langereis - @zenmumbler

import mkdirp from "mkdirp";

export function listingDirPath() {
	return `./spider_data/listings/`;
}

export function listingPath(issue: number) {
	return `${listingDirPath()}listing_${issue}.json`;
}

export function thumbsDirPath(issue: number) {
	return `../site/data/thumbs/${issue}/`;
}

export function localThumbPathForLDURL(issue: number, ldThumb: string) {
	const fileName = ldThumb.split("/").splice(-1);
	return thumbsDirPath(issue) + fileName;
}

export function entryPagesDirPath(issue: number) {
	return `./spider_data/entry_pages/entries_${issue}/`;
}
export function entryPageFilePath(issue: number, uid: number) {
	const ext = issue <= 37 ? "html" : "json";
	return `${entryPagesDirPath(issue)}entry_${uid}.${ext}`;
}
export function userJSONFilePath(issue: number, uid: number) {
	return `${entryPagesDirPath(issue)}user_${uid}.json`;
}

export function entriesCatalogPath(issue: number) {
	return `../site/data/ld${issue}_entries.json`;
}

// -- LD site URLs (old and new)

export function issueBaseURL(issue: number) {
	if (issue <= 37) {
		return `http://ludumdare.com/compo/ludum-dare-${issue}/`;
	}
	else {
		return `https://api.ldjam.com/vx/node/`;
	}
}

export function issueFeedID(issue: number) {
	// a direct map of issue to feed indexes
	// this can be retrieved with an API call, but I can't be arsed
	// so I need to update this every LD, 3 times a year. Good enough.
	const issue2Feed: { [i: number]: number } = {
		38: 9405,
		39: 32802,
		40: 49883,
		41: 73256,
		42: 97793
	};
	return issue2Feed[issue];
}

export function issueMinMonth(issue: number) {
	// a direct map of issue to minimum month of issuage
	// this is needed for now as the 'all' filter on listings ignores the feed ID...
	const issue2Date: { [i: number]: string } = {
		38: "2017-04",
		39: "2017-08",
		40: "2017-12",
		41: "2018-04",
		42: "2018-08"
	};
	return issue2Date[issue];
}

export function issueIndexPageURL(issue: number, offset: number) {
	if (issue <= 37) {
		return `${issueBaseURL(issue)}/?action=preview&start=${offset}`; // itemCount is fixed at 24
	}
	else {
		const feed = issueFeedID(issue);
		if (! feed) {
			throw new Error(`You have to update the issueFeedID mapping for issue ${issue}`);
		}
		return `${issueBaseURL(issue)}/feed/${feed}/all/item/game/compo+jam?offset=${offset}}&limit=24`;
	}
}


export function ensureDirectory(dir: string) {
	return new Promise((resolve, reject) => {
		mkdirp(dir, err => {
			if (err) {
				reject(err);
			}
			else {
				resolve();
			}
		});
	});
}

export function timeoutPromise(delayMS: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, delayMS);
	});
}
