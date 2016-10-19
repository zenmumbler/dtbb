// entries_scrape - part of dtbb
// by Arthur Langereis - @zenmumbler

import * as fs from "fs";
import * as request from "request";
import * as mkdirp from "mkdirp";

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

const baseURL = `http://ludumdare.com/compo/ludum-dare-${LDIssue}/`;
const entriesDir = `../spider_data/entry_pages/entries_${LDIssue}/`;
const entriesPrefix = "entry_";
const entriesPostfix = ".html";
const delayBetweenRequests = 50;

let entriesWritten = 0;
let failures = 0;

function ensureDirectory(dir: string) {
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


function load(urlList: string[], index: number) {
	if (index >= urlList.length) {
		console.info(`Done (wrote ${entriesWritten} entries, ${failures} failures)`);
		process.exit(failures);
	}

	const link = urlList[index];
	const uid = link.substr(link.indexOf("uid=") + 4);
	const filePath = entriesDir + entriesPrefix + uid + entriesPostfix;

	const next = (overrideDelay?: number) => {
		if (index % 10 === 0) {
			console.info((100 * (index / urlList.length)).toFixed(1) + "%");
		}
		setTimeout(() => { load(urlList, index + 1); }, overrideDelay || delayBetweenRequests);
	};

	if (fs.existsSync(filePath)) {
		next(1);
	}
	else {
		request(
			{
				url: link,
				timeout: 3000
			},
			(error, response, body) => {
				if (!error && response.statusCode === 200) {
					fs.writeFile(filePath, body, (err) => {
						if (err) {
							console.log(`Failed to write file for uid: ${uid}`, err);
							failures += 1;
						}
						else {
							entriesWritten += 1;
						}
						next();
					});
				}
				else {
					console.log(`Failed to load entry page for uid: ${uid}`, error, response ? response.statusCode : "-");
					failures += 1;
					next();
				}
			}
		);
	}
}

interface CatalogJSON {
	links: string[];
	thumbs: string[];
}

fs.readFile(`../spider_data/catalogs/catalog_${LDIssue}.json`, "utf8", (catalogErr, data) => {
	if (catalogErr) {
		console.info(`Could not load catalog for issue ${LDIssue}: ${catalogErr}`);
	}
	else {
		ensureDirectory(entriesDir)
			.then(() => {
				const json = JSON.parse(data) as CatalogJSON;
				const links = json.links.map(u => baseURL + u);
				load(links, 0);
			})
			.catch(dirErr => {
				console.info(`Could not create entries directory: ${dirErr}`);
			});
	}
});
