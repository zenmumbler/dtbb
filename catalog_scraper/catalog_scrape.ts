// catalog_scraper - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as request from "request";
import * as http from "http";

const LD_PAGE_SIZE = 24;

let offset = 0;
let allLinks: string[] = [];
let allThumbs: string[] = [];

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
	process.abort();
}

function next() {
	request(
		`http://ludumdare.com/compo/ludum-dare-${LDIssue}/?action=preview&start=${offset}`,
		(error: any, response: http.IncomingMessage, body: string) => {
			let completed = false;

			if (!error && response.statusCode === 200) {
				const links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
				const thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);

				if (links && thumbs) {
					if (links.length === thumbs.length + 1) {
						links.shift(); // remove hidden "edit self" link
					}

					if (links.length === thumbs.length) {
						allLinks = allLinks.concat(links);
						allThumbs = allThumbs.concat(thumbs);
					}
					else {
						console.error("links/thumbs len mismatch at offset " + offset, links.length, thumbs.length);
						console.info(links);
						console.info("------------");
						console.info(thumbs);
						return;
					}
				}
				else {
					completed = true;
				}
			}
			else {
				console.error("Failed to get page for offset " + offset, response.statusCode, error);
				return;
			}

			if (! completed) {
				offset += LD_PAGE_SIZE;
				console.info(`fetched ${allLinks.length} records...`);
				setTimeout(next, 50);
			}
			else {
				console.info(`Writing catalog (${allLinks.length} entries)...`);
				const catalogJSON = JSON.stringify({ links: allLinks, thumbs: allThumbs });

				fs.writeFile(`../spider_data/catalogs/catalog_${LDIssue}.json`, catalogJSON, (err) => {
					if (err) {
						console.error("Failed to write catalog file", err);
					}
					else {
						console.info("Done.");
					}
				});
			}
		}
	);
}

next();
