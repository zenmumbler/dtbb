'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var got = _interopDefault(require('got'));
var mkdirp = require('mkdirp');
var jsdom = require('jsdom');

function listingDirPath() {
    return `./spider_data/listings/`;
}
function listingPath(issue) {
    return `${listingDirPath()}listing_${issue}.json`;
}
function thumbsDirPath(issue) {
    return `../site/data/thumbs/${issue}/`;
}
function localThumbPathForLDURL(issue, ldThumb) {
    const fileName = ldThumb.split("/").splice(-1);
    return thumbsDirPath(issue) + fileName;
}
function entryPagesDirPath(issue) {
    return `./spider_data/entry_pages/entries_${issue}/`;
}
function entryPageFilePath(issue, uid) {
    const ext = issue <= 37 ? "html" : "json";
    return `${entryPagesDirPath(issue)}entry_${uid}.${ext}`;
}
function userJSONFilePath(issue, uid) {
    return `${entryPagesDirPath(issue)}user_${uid}.json`;
}
function entriesCatalogPath(issue) {
    return `../site/data/ld${issue}_entries.json`;
}
function issueBaseURL(issue) {
    if (issue <= 37) {
        return `http://ludumdare.com/compo/ludum-dare-${issue}/`;
    }
    else {
        return `https://api.ldjam.com/vx/node/`;
    }
}
function issueFeedID(issue) {
    const issue2Feed = {
        38: 9405,
        39: 32802,
        40: 49883,
        41: 73256,
        42: 97793,
        43: 120415,
        44: 139254,
        45: 159347,
        46: 176557,
        47: -1,
        48: -1,
        49: -1
    };
    return issue2Feed[issue];
}
function issueIndexPageURL(issue, offset, limit) {
    if (issue <= 37) {
        return `${issueBaseURL(issue)}?action=preview&start=${offset}`;
    }
    else {
        const feed = issueFeedID(issue);
        if (!feed) {
            throw new Error(`You have to update the issueFeedID mapping for issue ${issue}`);
        }
        return `${issueBaseURL(issue)}feed/${feed}/grade-01-result+reverse+parent/item/game/compo+jam?offset=${offset}&limit=${limit}`;
    }
}
function ensureDirectory(dir) {
    return mkdirp(dir);
}
function timeoutPromise(delayMS) {
    return new Promise(resolve => {
        setTimeout(resolve, delayMS);
    });
}

const LD_PAGE_SIZE = 24;
const LD_NEW_PAGE_SIZE = 100;
const DELAY_BETWEEN_REQUESTS_MS = 20;
function processBody(state, body) {
    const links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
    const thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);
    if (links && thumbs) {
        if (links.length === thumbs.length + 1) {
            links.shift();
        }
        if (links.length === thumbs.length) {
            state.allLinks = state.allLinks.concat(links);
            state.allThumbs = state.allThumbs.concat(thumbs);
        }
        else {
            throw new Error(`mismatch of link and thumb count (${links.length} vs ${thumbs.length}) at offset ${state.offset}`);
        }
        return false;
    }
    return true;
}
function processBodyNew(state, body) {
    const listingJSON = JSON.parse(body);
    if (listingJSON && listingJSON.status === 200 && listingJSON.feed) {
        const ids = listingJSON.feed.map(g => "" + g.id);
        state.allLinks = state.allLinks.concat(ids);
        if (ids.length < listingJSON.feed.length) {
            console.info(`skipping ${listingJSON.feed.length - ids.length} entries from older LD.`);
        }
        return listingJSON.feed.length === 0;
    }
    else {
        throw new Error(`Something wrong with the feed at offset ${state.offset}`);
    }
}
function next(state) {
    const processFn = (state.issue <= 37) ? processBody : processBodyNew;
    const pageSize = (state.issue <= 37) ? LD_PAGE_SIZE : LD_NEW_PAGE_SIZE;
    return got(`${issueIndexPageURL(state.issue, state.offset, pageSize)}`)
        .then((response) => {
        let completed = processFn(state, response.body);
        if (!completed) {
            state.offset += pageSize;
            console.info(`fetched ${state.allLinks.length} records...`);
            return timeoutPromise(DELAY_BETWEEN_REQUESTS_MS).then(_ => next(state));
        }
        else {
            console.info(`Writing listing (${state.allLinks.length} entries)...`);
            const listingJSON = JSON.stringify({ links: state.allLinks, thumbs: state.allThumbs });
            return ensureDirectory(listingDirPath()).then(() => {
                return fs.promises.writeFile(listingPath(state.issue), listingJSON)
                    .then(() => {
                    console.info("Done.");
                }, err => {
                    console.error("Failed to write listing file", err);
                });
            });
        }
    }, (error) => {
        throw new Error(`Failed to get page for offset ${state.offset}, error: ${error}`);
    });
}
function fetchListing(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info(`Fetching listing for issue ${issue}`);
    return next({
        issue,
        offset: 0,
        allLinks: [],
        allThumbs: []
    });
}

const DELAY_BETWEEN_REQUESTS_MS$1 = 50;
function load(state) {
    if (state.index >= state.urlList.length) {
        console.info(`Done (wrote ${state.entriesWritten} entries, ${state.failures} failures)`);
        return Promise.resolve();
    }
    const [linkType, link] = state.urlList[state.index].split("|");
    let gid;
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
    const next = (overrideDelay) => {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + `% (${state.index}/${state.urlList.length})`);
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$1)
            .then(_ => load(state));
    };
    if (fs.existsSync(filePath)) {
        if (linkType === "E") {
            return new Promise(resolve => {
                fs.readFile(filePath, "utf8", (err, data) => {
                    if (err) {
                        state.urlList.push(`E|${issueBaseURL(state.issue)}/get/${gid}`);
                    }
                    else {
                        const json = JSON.parse(data);
                        if (json.node[0] && json.node[0].meta) {
                            for (const author of json.node[0].meta.author) {
                                if (!state.authorIDs.has(author)) {
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
        return got(link, { timeout: 3000 })
            .then((response) => {
            if (linkType === "E" && state.issue >= 38) {
                const json = JSON.parse(response.body);
                if (json && json.node && json.node[0] && json.node[0].meta) {
                    for (const author of json.node[0].meta.author) {
                        if (!state.authorIDs.has(author)) {
                            state.authorIDs.add(author);
                            state.urlList.push(`U|${issueBaseURL(state.issue)}/get/${author}`);
                        }
                    }
                }
            }
            return fs.promises.writeFile(filePath, response.body)
                .then(() => {
                state.entriesWritten += 1;
                return next();
            }, err => {
                console.info(`Failed to write file for gid: ${gid}`, err);
                state.failures += 1;
                return next();
            });
        }, (error) => {
            console.info(`Failed to load entry page for gid: ${gid}`, error);
            state.failures += 1;
            return next();
        });
    }
}
function fetchEntryPages(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info(`Fetching entry pages for issue ${issue}`);
    return new Promise((resolve, reject) => {
        fs.readFile(listingPath(issue), "utf8", (listingErr, data) => {
            if (listingErr) {
                reject(`Could not load listing for issue ${issue}: ${listingErr}`);
                return;
            }
            resolve(ensureDirectory(entryPagesDirPath(issue))
                .then(() => {
                const json = JSON.parse(data);
                let links;
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
            }));
        });
    });
}

const DELAY_BETWEEN_REQUESTS_MS$2 = 10;
function load$1(state) {
    if (state.index >= state.urlList.length) {
        console.info(`Done (wrote ${state.thumbsWritten} thumbs, ${state.failures} failures)`);
        return Promise.resolve();
    }
    const url = state.urlList[state.index];
    const localPath = localThumbPathForLDURL(state.issue, url);
    const next = (overrideDelay) => {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$2)
            .then(_ => load$1(state));
    };
    if (fs.existsSync(localPath)) {
        return next(1);
    }
    else {
        return got(url, { responseType: "buffer", timeout: 3000 })
            .then(response => {
            return fs.promises.writeFile(localPath, response.body)
                .then(() => {
                state.thumbsWritten += 1;
                return next();
            }, err => {
                console.info(`Failed to write thumb: ${localPath}`, err);
                state.failures += 1;
                return next();
            });
        }, error => {
            console.info(`Failed to load thumb ${url}`, error);
            state.failures += 1;
            return next();
        });
    }
}
function fetchThumbs(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info(`Fetching thumbs for issue ${issue}`);
    const sourcePath = issue <= 37 ? listingPath(issue) : entriesCatalogPath(issue);
    return new Promise((resolve, reject) => {
        fs.readFile(sourcePath, "utf8", (listingErr, data) => {
            if (listingErr) {
                reject(`Could not load listing/entries for issue ${issue}: ${listingErr}`);
                return;
            }
            return (ensureDirectory(thumbsDirPath(issue))
                .then(() => {
                const thumbs = issue <= 37 ?
                    JSON.parse(data).thumbs :
                    JSON.parse(data).entries.filter(e => e.thumbnail_url.length > 0).map(e => e.thumbnail_url);
                resolve(load$1({
                    issue,
                    index: 0,
                    urlList: thumbs,
                    thumbsWritten: 0,
                    failures: 0
                }));
            })
                .catch(dirErr => {
                reject(`Could not create thumbs directory: ${dirErr}`);
            }));
        });
    });
}

function makePlatformLookup(plats) {
    const pl = {};
    let shift = 0;
    for (const p of plats) {
        pl[p.key] = {
            key: p.key,
            label: p.label,
            mask: 1 << shift
        };
        shift += 1;
    }
    return pl;
}
const Platforms = makePlatformLookup([
    { key: "desktop", label: "Desktop" },
    { key: "win", label: "Windows" },
    { key: "mac", label: "MacOS" },
    { key: "linux", label: "Linux" },
    { key: "web", label: "Web" },
    { key: "java", label: "Java" },
    { key: "vr", label: "VR" },
    { key: "mobile", label: "Mobile" },
]);
const IssueThemeNames = {
    15: "Caverns",
    16: "Exploration",
    17: "Islands",
    18: "Enemies as Weapons",
    19: "Discovery",
    20: "It’s Dangerous to go Alone! Take this!",
    21: "Escape",
    22: "Alone",
    23: "Tiny World",
    24: "Evolution",
    25: "You are the Villain",
    26: "Minimalism",
    27: "10 Seconds",
    28: "You Only Get One",
    29: "Beneath the Surface",
    30: "Connected Worlds",
    31: "Entire Game on One Screen",
    32: "An Unconventional Weapon",
    33: "You are the Monster",
    34: "Two Button Controls, Growing",
    35: "Shapeshift",
    36: "Ancient Technology",
    37: "One Room",
    38: "A Small World",
    39: "Running out of Power",
    40: "The more you have, the worse it is",
    41: "Two Incompatible Genres",
    42: "Running out of Space",
    43: "Sacrifices must be made",
    44: "Your life is currency",
    45: "Start with nothing",
    46: "Keep it alive"
};

function mergeSet(dest, source) {
    if (source && source.forEach) {
        source.forEach(val => dest.add(val));
    }
}
function newSetFromArray(source) {
    const set = new Set();
    const len = source.length;
    for (let vi = 0; vi < len; ++vi) {
        set.add(source[vi]);
    }
    return set;
}
function arrayFromSet(source) {
    const arr = [];
    source.forEach(val => arr.push(val));
    return arr;
}

function termify(text) {
    return text
        .toLowerCase()
        .replace(/os.x/g, "osx")
        .replace(/[\(\)\/\.\n\r\*\?\-]/g, " ")
        .replace(/ +/g, " ")
        .trim()
        .split(" ")
        .map(term => {
        return term
            .replace("lve", "love")
            .replace(",", "")
            .replace(/^mac$/, "osx");
    });
}
function pks(keys) {
    return newSetFromArray(keys);
}
const linkPlatformMapping = {
    download: pks(["desktop"]),
    love: pks(["win", "mac", "linux", "desktop"]),
    love2d: pks(["win", "mac", "linux", "desktop"]),
    standalone: pks(["desktop"]),
    win: pks(["win", "desktop"]),
    win32: pks(["win", "desktop"]),
    windows32: pks(["win", "desktop"]),
    win64: pks(["win", "desktop"]),
    windows64: pks(["win", "desktop"]),
    windows: pks(["win", "desktop"]),
    exe: pks(["win", "desktop"]),
    osx: pks(["mac", "desktop"]),
    macos: pks(["mac", "desktop"]),
    linux: pks(["linux", "desktop"]),
    ubuntu: pks(["linux", "desktop"]),
    web: pks(["web"]),
    html5: pks(["web"]),
    chrome: pks(["web"]),
    browser: pks(["web"]),
    firefox: pks(["web"]),
    safari: pks(["web"]),
    webgl: pks(["web"]),
    online: pks(["web"]),
    webplayer: pks(["web"]),
    newgrounds: pks(["web"]),
    java: pks(["java"]),
    java7: pks(["java"]),
    java8: pks(["java"]),
    jar: pks(["java"]),
    flash: pks(["web"]),
    swf: pks(["web"]),
    vr: pks(["vr"]),
    oculus: pks(["vr"]),
    vive: pks(["vr"]),
    cardboard: pks(["vr"]),
    android: pks(["mobile"]),
    apk: pks(["mobile"]),
    ios: pks(["mobile"]),
};
const descriptionPlatformMapping = {
    exe: pks(["win", "desktop"]),
    love2d: pks(["win", "mac", "linux", "desktop"]),
    html5: pks(["web"]),
    chrome: pks(["web"]),
    firefox: pks(["web"]),
    safari: pks(["web"]),
    java: pks(["java", "desktop"]),
    jar: pks(["java", "desktop"]),
    flash: pks(["web"]),
    swf: pks(["web"]),
    vr: pks(["vr"]),
    oculus: pks(["vr"]),
    vive: pks(["vr"]),
    cardboard: pks(["vr"]),
};
function detectPlatforms(entry) {
    const plats = new Set();
    const descTerms = termify(entry.description);
    const urlTerms = entry.links
        .map(link => termify(link.label)
        .concat(termify(link.url)))
        .reduce((ta, tn) => ta.concat(tn), []);
    for (const term of urlTerms) {
        const lks = linkPlatformMapping[term];
        if (lks) {
            mergeSet(plats, lks);
        }
    }
    for (const term of descTerms) {
        const dks = descriptionPlatformMapping[term];
        if (dks) {
            mergeSet(plats, dks);
        }
    }
    if (plats.size === 0 && entry.ld_issue >= 38) {
        for (const term of descTerms) {
            const dks = descriptionPlatformMapping[term];
            if (dks) {
                mergeSet(plats, dks);
            }
        }
    }
    if (plats.size === 0) {
        if ((urlTerms.indexOf("itch") > -1) ||
            (descTerms.indexOf("wasd") > -1) ||
            (descTerms.indexOf("awsd") > -1) ||
            (descTerms.indexOf("aswd") > -1)) {
            plats.add("desktop");
        }
    }
    if (plats.has("java")) {
        plats.delete("win");
        plats.delete("mac");
        plats.delete("linux");
    }
    return plats;
}

function entryDoc(issue, uid) {
    return new Promise((resolve, reject) => {
        jsdom.JSDOM.fromFile(entryPageFilePath(issue, uid))
            .then((jsdom) => {
            resolve(jsdom.window.document);
        }, (err) => {
            reject(err);
        });
    });
}
const apiLinkTypeDescription = {
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
function entryJSONDoc(issue, gid) {
    return new Promise((resolve, reject) => {
        fs.readFile(entryPageFilePath(issue, gid), "utf8", (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                const entryJSON = JSON.parse(data);
                resolve(entryJSON);
            }
        });
    });
}
function userJSONDoc(issue, uid) {
    return new Promise((resolve, reject) => {
        fs.readFile(userJSONFilePath(issue, uid), "utf8", (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(JSON.parse(data));
            }
        });
    });
}
function loadCatalog(issue) {
    return new Promise((resolve, reject) => {
        fs.readFile(listingPath(issue), "utf8", (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                const listingJSON = JSON.parse(data);
                resolve(listingJSON);
            }
        });
    });
}
function extractRatings(table) {
    const ratings = [];
    if (table) {
        const trs = [].slice.call(table.querySelectorAll("tr"));
        for (const row of trs) {
            const tds = row.querySelectorAll("td");
            if (tds.length !== 3) {
                console.info("weird rating table found");
                break;
            }
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
            const area = (tds[1].innerHTML.trim().toLowerCase().replace("(jam)", ""));
            const score = parseFloat(tds[2].innerHTML.trim());
            if (rank > -1 && area.length > 0 && !isNaN(score)) {
                ratings.push({ area, rank, score });
            }
        }
    }
    return ratings;
}
function createEntry(relURI, issue, uid, thumbImg, doc) {
    const ldBaseURL = "http://ludumdare.com/compo/";
    const eventBaseURL = issueBaseURL(issue);
    const base = doc.querySelector("#compo2");
    if (!base) {
        throw new Error(`no base element in page of uid: ${uid}`);
    }
    const titleElem = base.querySelector("h2");
    const avatarImg = base.querySelector("img.avatar");
    const authorLink = titleElem && titleElem.parentElement.querySelector("a");
    const categoryText = (titleElem && titleElem.parentElement.querySelector("i").textContent) || "";
    const authorName = (authorLink && authorLink.querySelector("strong").textContent) || "";
    const screensArrayElem = base.querySelector(".shot-nav");
    const screensArray = [].slice.call((screensArrayElem && screensArrayElem.querySelectorAll("img")) || []);
    const linksArray = [].slice.call(base.querySelectorAll(".links a"));
    const description = (screensArrayElem && screensArrayElem.nextSibling && screensArrayElem.nextSibling.textContent) || "";
    const ratingTable = base.querySelector("table");
    if ([titleElem, avatarImg, authorLink, categoryText, authorName, screensArrayElem].some(t => t == null)) {
        throw new Error(`can't get all relevant elements from page source of uid ${uid}`);
    }
    const categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");
    const entry = {
        ld_issue: issue,
        title: titleElem.textContent || "<no title>",
        category: categoryStr.indexOf("jam") > -1 ? "jam" : "compo",
        description,
        thumbnail_url: thumbImg,
        entry_url: eventBaseURL + relURI,
        author: {
            name: authorName,
            uid,
            avatar_url: avatarImg.src,
            home_url: ldBaseURL + authorLink.getAttribute("href").substr(3)
        },
        screens: screensArray.map(screen => {
            const imgoc = screen.getAttribute("onclick");
            const urls = { thumbnail_url: "", full_url: "" };
            if (imgoc) {
                urls.thumbnail_url = screen.src.replace(/compo2\/\//g, "compo2/");
                urls.full_url = imgoc.substring(imgoc.lastIndexOf("http://"), imgoc.indexOf('")'));
            }
            return urls;
        })
            .filter(s => s.full_url.length > 0),
        links: linksArray.map(link => {
            return {
                label: link.textContent || "",
                url: link.getAttribute("href")
            };
        }),
        ratings: extractRatings(ratingTable),
        platforms: []
    };
    entry.platforms = arrayFromSet(detectPlatforms(entry));
    return entry;
}
function resolveLDJImage(imageRef, thumbSize = "480x384") {
    const imageRelPath = imageRef.replace("///content", "").replace("///raw", "");
    return {
        thumbnail_url: imageRelPath.length > 0 ? `https://static.jam.vg/content/${imageRelPath}.${thumbSize}.fit.jpg` : "",
        full_url: imageRelPath.length > 0 ? `https://static.jam.vg/raw/${imageRelPath}` : ""
    };
}
function extractMDRefs(text) {
    const refs = { links: [], images: [] };
    const matcher = /\!?\[([^\]]*)\]\(([^\)]*)\)/g;
    let links;
    while (links = matcher.exec(text)) {
        if (links[0].charAt(0) === "!") {
            refs.images.push(links[2]);
        }
        else {
            refs.links.push({ label: links[1], url: links[2] });
        }
    }
    return refs;
}
const deduper = new Set();
function createEntryJSON(issue, apiEntry, apiUser) {
    const doc = apiEntry.node[0];
    const author = apiUser.node[0];
    const eventBaseURL = "https://ldjam.com";
    if (doc.subsubtype === "unfinished" || doc.parent !== issueFeedID(issue)) {
        return undefined;
    }
    const uniqueRef = doc.name + author.id;
    if (deduper.has(uniqueRef)) {
        console.info(`skipped duplicate: ${uniqueRef}`);
        return undefined;
    }
    deduper.add(uniqueRef);
    const refs = extractMDRefs(doc.body);
    const screens = refs.images.map(imgRef => resolveLDJImage(imgRef));
    const links = [
        { label: doc.meta["link-01-tag"], url: doc.meta["link-01"] },
        { label: doc.meta["link-02-tag"], url: doc.meta["link-02"] },
        { label: doc.meta["link-03-tag"], url: doc.meta["link-03"] },
        { label: doc.meta["link-04-tag"], url: doc.meta["link-04"] },
        { label: doc.meta["link-05-tag"], url: doc.meta["link-05"] },
    ]
        .filter(l => l.url !== undefined && l.label !== undefined)
        .map(l => { l.label = apiLinkTypeDescription[l.label] || "Other"; return l; });
    const entry = {
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
const MAX_INFLIGHT = 10;
function extractEntryFromPage(state, link, thumb) {
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
            .then(({ entry, user }) => {
            return createEntryJSON(state.issue, entry, user);
        });
    }
}
function completed(state) {
    if (state.completionPromise) {
        return state.completionPromise;
    }
    console.info(`Extraction complete, writing ${state.entries.length} entries to catalog file...`);
    const catalog = {
        issue: state.issue,
        theme: IssueThemeNames[state.issue],
        stats: state.stats,
        entries: state.entries
    };
    const catalogJSON = JSON.stringify(catalog);
    state.completionPromise =
        fs.promises.writeFile(entriesCatalogPath(state.issue), catalogJSON)
            .then(() => console.info("Done"), err => {
            console.info("Could not write catalog file: ", err);
            throw err;
        });
    return state.completionPromise;
}
function updateStats(stats, entry) {
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
function tryNext(state) {
    const checkDone = function () {
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
        const link = state.source.links.shift();
        const thumb = state.source.thumbs.shift();
        const unqueueSelf = function (prom) {
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
        const p = extractEntryFromPage(state, link, thumb)
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
function extractEntries(issue) {
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

const tasks = new Map();
function task(name, action) {
    tasks.set(name, action);
}
function runTask(name) {
    const task = tasks.get(name);
    if (!task) {
        console.info(`unknown task: ${name}`);
        return;
    }
    return task.apply(global, process.argv.slice(3));
}
function finished() {
    console.info("All tasks done.");
}
function runt() {
    const command = process.argv[2];
    if (!command) {
        const allTasks = [];
        tasks.forEach((_, name) => allTasks.push(name));
        console.info(`no task specified, available: ${allTasks}`);
    }
    else {
        const result = runTask(command);
        if (result instanceof Promise) {
            result.then(finished);
        }
        else {
            finished();
        }
    }
}

const MIN_ISSUE = 15;
const MAX_ISSUE = 50;
function getIssueRange(issueSA, issueSB) {
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
function rangedTaskPerIssue(f, t, sitFn) {
    const range = getIssueRange(f, t);
    if (range) {
        let issue = range.from - 1;
        const next = function () {
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
task("listing", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchListing);
});
task("entries", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchEntryPages);
});
task("thumbs", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchThumbs);
});
task("extract", function (f, t) {
    return rangedTaskPerIssue(f, t, extractEntries);
});
runt();
