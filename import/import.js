'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var mkdirp = _interopDefault(require('mkdirp'));
var request = _interopDefault(require('request'));
var fs = require('fs');
var jsdom = require('jsdom');

function listingDirPath() {
    return "./spider_data/listings/";
}
function listingPath(issue) {
    return listingDirPath() + "listing_" + issue + ".json";
}
function thumbsDirPath(issue) {
    return "../site/data/thumbs/" + issue + "/";
}
function localThumbPathForLDURL(issue, ldThumb) {
    var fileName = ldThumb.split("/").splice(-1);
    return thumbsDirPath(issue) + fileName;
}
function entryPagesDirPath(issue) {
    return "./spider_data/entry_pages/entries_" + issue + "/";
}
function entryPageFilePath(issue, uid) {
    var ext = issue <= 37 ? "html" : "json";
    return entryPagesDirPath(issue) + "entry_" + uid + "." + ext;
}
function userJSONFilePath(issue, uid) {
    return entryPagesDirPath(issue) + "user_" + uid + ".json";
}
function entriesCatalogPath(issue) {
    return "../site/data/ld" + issue + "_entries.json";
}
function issueBaseURL(issue) {
    if (issue <= 37) {
        return "http://ludumdare.com/compo/ludum-dare-" + issue + "/";
    }
    else {
        return "https://api.ldjam.com/vx/node/";
    }
}
function issueFeedID(issue) {
    var issue2Feed = {
        38: 9405,
        39: 32802,
        40: 49883,
        41: 73256,
        42: 97793
    };
    return issue2Feed[issue];
}
function issueMinMonth(issue) {
    var issue2Date = {
        38: "2017-04",
        39: "2017-08",
        40: "2017-12",
        41: "2018-04",
        42: "2018-08"
    };
    return issue2Date[issue];
}
function issueIndexPageURL(issue, offset) {
    if (issue <= 37) {
        return issueBaseURL(issue) + "/?action=preview&start=" + offset;
    }
    else {
        var feed = issueFeedID(issue);
        if (!feed) {
            throw new Error("You have to update the issueFeedID mapping for issue " + issue);
        }
        return issueBaseURL(issue) + "/feed/" + feed + "/all/item/game/compo+jam?offset=" + offset + "}&limit=24";
    }
}
function ensureDirectory(dir) {
    return new Promise(function (resolve, reject) {
        mkdirp(dir, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
function timeoutPromise(delayMS) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delayMS);
    });
}

var LD_PAGE_SIZE = 24;
var DELAY_BETWEEN_REQUESTS_MS = 20;
function processBody(state, body) {
    var links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
    var thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);
    if (links && thumbs) {
        if (links.length === thumbs.length + 1) {
            links.shift();
        }
        if (links.length === thumbs.length) {
            state.allLinks = state.allLinks.concat(links);
            state.allThumbs = state.allThumbs.concat(thumbs);
        }
        else {
            throw new Error("mismatch of link and thumb count (" + links.length + " vs " + thumbs.length + ") at offset " + state.offset);
        }
        return false;
    }
    return true;
}
function processBodyNew(state, body) {
    var listingJSON = JSON.parse(body);
    if (listingJSON && listingJSON.status === 200 && listingJSON.feed) {
        var ids = listingJSON.feed.filter(function (g) { return g.modified.indexOf(issueMinMonth(state.issue)) === 0; }).map(function (g) { return "" + g.id; });
        state.allLinks = state.allLinks.concat(ids);
        if (ids.length < listingJSON.feed.length) {
            console.info("skipping " + (listingJSON.feed.length - ids.length) + " entries from older LD.");
        }
        return listingJSON.feed.length === 0;
    }
    else {
        throw new Error("Something wrong with the feed at offset " + state.offset);
    }
}
function next(state) {
    var processFn = (state.issue <= 37) ? processBody : processBodyNew;
    return new Promise(function (resolve, reject) {
        request("" + issueIndexPageURL(state.issue, state.offset), function (error, response, body) {
            var completed = false;
            if (!error && response.statusCode === 200) {
                try {
                    completed = processFn(state, body);
                }
                catch (e) {
                    reject(e.message);
                    return;
                }
            }
            else {
                reject("Failed to get page for offset " + state.offset + ", status: " + response.statusCode + ", error: " + error);
                return;
            }
            if (!completed) {
                state.offset += LD_PAGE_SIZE;
                console.info("fetched " + state.allLinks.length + " records...");
                resolve(timeoutPromise(DELAY_BETWEEN_REQUESTS_MS).then(function (_) { return next(state); }));
            }
            else {
                console.info("Writing listing (" + state.allLinks.length + " entries)...");
                var listingJSON_1 = JSON.stringify({ links: state.allLinks, thumbs: state.allThumbs });
                ensureDirectory(listingDirPath()).then(function () {
                    fs.writeFile(listingPath(state.issue), listingJSON_1, function (err) {
                        if (err) {
                            console.error("Failed to write listing file", err);
                        }
                        else {
                            console.info("Done.");
                            resolve();
                        }
                    });
                });
            }
        });
    });
}
function fetchListing(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching listing for issue " + issue);
    return next({
        issue: issue,
        offset: 0,
        allLinks: [],
        allThumbs: []
    });
}

var DELAY_BETWEEN_REQUESTS_MS$1 = 50;
function load(state) {
    if (state.index >= state.urlList.length) {
        console.info("Done (wrote " + state.entriesWritten + " entries, " + state.failures + " failures)");
        return Promise.resolve();
    }
    var _a = state.urlList[state.index].split("|"), linkType = _a[0], link = _a[1];
    var gid;
    if (state.issue <= 37) {
        if (linkType !== "E") {
            throw new Error("Can only handle entry links in LD <= 37");
        }
        gid = parseInt(link.substr(link.indexOf("uid=") + 4));
    }
    else {
        gid = parseInt(link.substr(link.lastIndexOf("/") + 1));
    }
    var filePath = linkType === "E" ? entryPageFilePath(state.issue, gid) : userJSONFilePath(state.issue, gid);
    var next = function (overrideDelay) {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + ("% (" + state.index + "/" + state.urlList.length + ")"));
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$1)
            .then(function (_) { return load(state); });
    };
    if (fs.existsSync(filePath)) {
        if (linkType === "E") {
            return new Promise(function (resolve) {
                fs.readFile(filePath, "utf8", function (err, data) {
                    if (err) {
                        state.urlList.push("E|" + issueBaseURL(state.issue) + "/get/" + gid);
                    }
                    else {
                        var json = JSON.parse(data);
                        if (json.node[0] && json.node[0].meta) {
                            for (var _i = 0, _a = json.node[0].meta.author; _i < _a.length; _i++) {
                                var author = _a[_i];
                                if (!state.authorIDs.has(author)) {
                                    state.authorIDs.add(author);
                                    state.urlList.push("U|" + issueBaseURL(state.issue) + "/get/" + author);
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
        return new Promise(function (resolve) {
            request({
                url: link,
                timeout: 3000
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    if (linkType === "E" && state.issue >= 38) {
                        var json = JSON.parse(body);
                        if (json && json.node && json.node[0] && json.node[0].meta) {
                            for (var _i = 0, _a = json.node[0].meta.author; _i < _a.length; _i++) {
                                var author = _a[_i];
                                if (!state.authorIDs.has(author)) {
                                    state.authorIDs.add(author);
                                    state.urlList.push("U|" + issueBaseURL(state.issue) + "/get/" + author);
                                }
                            }
                        }
                    }
                    fs.writeFile(filePath, body, function (err) {
                        if (err) {
                            console.info("Failed to write file for gid: " + gid, err);
                            state.failures += 1;
                        }
                        else {
                            state.entriesWritten += 1;
                        }
                        resolve(next());
                    });
                }
                else {
                    console.info("Failed to load entry page for gid: " + gid, error, response ? response.statusCode : "-");
                    state.failures += 1;
                    resolve(next());
                }
            });
        });
    }
}
function fetchEntryPages(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching entry pages for issue " + issue);
    return new Promise(function (resolve, reject) {
        fs.readFile(listingPath(issue), "utf8", function (listingErr, data) {
            if (listingErr) {
                reject("Could not load listing for issue " + issue + ": " + listingErr);
                return;
            }
            resolve(ensureDirectory(entryPagesDirPath(issue))
                .then(function () {
                var json = JSON.parse(data);
                var links;
                var baseURL = issueBaseURL(issue);
                if (issue <= 37) {
                    links = json.links.map(function (u) { return "E|" + baseURL + u; });
                }
                else {
                    links = json.links.map(function (id) { return "E|" + baseURL + "/get/" + id; });
                }
                return load({
                    issue: issue,
                    index: 0,
                    urlList: links,
                    entriesWritten: 0,
                    failures: 0,
                    authorIDs: new Set()
                });
            })
                .catch(function (dirErr) {
                reject("Could not create entries directory: " + dirErr);
            }));
        });
    });
}

var DELAY_BETWEEN_REQUESTS_MS$2 = 10;
function load$1(state) {
    if (state.index >= state.urlList.length) {
        console.info("Done (wrote " + state.thumbsWritten + " thumbs, " + state.failures + " failures)");
        return Promise.resolve();
    }
    var url = state.urlList[state.index];
    var localPath = localThumbPathForLDURL(state.issue, url);
    var next = function (overrideDelay) {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$2)
            .then(function (_) { return load$1(state); });
    };
    if (fs.existsSync(localPath)) {
        return next(1);
    }
    else {
        return new Promise(function (resolve) {
            request({
                url: url,
                encoding: null,
                timeout: 3000
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    fs.writeFile(localPath, body, function (err) {
                        if (err) {
                            console.info("Failed to write thumb: " + localPath, err);
                            state.failures += 1;
                        }
                        else {
                            state.thumbsWritten += 1;
                        }
                        resolve(next());
                    });
                }
                else {
                    console.info("Failed to load thumb " + url, error, response ? response.statusCode : "-");
                    state.failures += 1;
                    resolve(next());
                }
            });
        });
    }
}
function fetchThumbs(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching thumbs for issue " + issue);
    var sourcePath = issue <= 37 ? listingPath(issue) : entriesCatalogPath(issue);
    return new Promise(function (resolve, reject) {
        fs.readFile(sourcePath, "utf8", function (listingErr, data) {
            if (listingErr) {
                reject("Could not load listing/entries for issue " + issue + ": " + listingErr);
                return;
            }
            return (ensureDirectory(thumbsDirPath(issue))
                .then(function () {
                var thumbs = issue <= 37 ?
                    JSON.parse(data).thumbs :
                    JSON.parse(data).entries.filter(function (e) { return e.thumbnail_url.length > 0; }).map(function (e) { return e.thumbnail_url; });
                resolve(load$1({
                    issue: issue,
                    index: 0,
                    urlList: thumbs,
                    thumbsWritten: 0,
                    failures: 0
                }));
            })
                .catch(function (dirErr) {
                reject("Could not create thumbs directory: " + dirErr);
            }));
        });
    });
}

function makePlatformLookup(plats) {
    var pl = {};
    var shift = 0;
    for (var _i = 0, plats_1 = plats; _i < plats_1.length; _i++) {
        var p = plats_1[_i];
        pl[p.key] = {
            key: p.key,
            label: p.label,
            mask: 1 << shift
        };
        shift += 1;
    }
    return pl;
}
var Platforms = makePlatformLookup([
    { key: "desktop", label: "Desktop" },
    { key: "win", label: "Windows" },
    { key: "mac", label: "MacOS" },
    { key: "linux", label: "Linux" },
    { key: "web", label: "Web" },
    { key: "java", label: "Java" },
    { key: "vr", label: "VR" },
    { key: "mobile", label: "Mobile" },
]);
var IssueThemeNames = {
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
    42: "Running out of Space"
};

function mergeSet(dest, source) {
    if (source && source.forEach) {
        source.forEach(function (val) { return dest.add(val); });
    }
}
function newSetFromArray(source) {
    var set = new Set();
    var len = source.length;
    for (var vi = 0; vi < len; ++vi) {
        set.add(source[vi]);
    }
    return set;
}
function arrayFromSet(source) {
    var arr = [];
    source.forEach(function (val) { return arr.push(val); });
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
        .map(function (term) {
        return term
            .replace("lve", "love")
            .replace(",", "")
            .replace(/^mac$/, "osx");
    });
}
function pks(keys) {
    return newSetFromArray(keys);
}
var linkPlatformMapping = {
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
var descriptionPlatformMapping = {
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
    var plats = new Set();
    var descTerms = termify(entry.description);
    var urlTerms = entry.links
        .map(function (link) {
        return termify(link.label)
            .concat(termify(link.url));
    })
        .reduce(function (ta, tn) { return ta.concat(tn); }, []);
    for (var _i = 0, urlTerms_1 = urlTerms; _i < urlTerms_1.length; _i++) {
        var term = urlTerms_1[_i];
        var lks = linkPlatformMapping[term];
        if (lks) {
            mergeSet(plats, lks);
        }
    }
    for (var _a = 0, descTerms_1 = descTerms; _a < descTerms_1.length; _a++) {
        var term = descTerms_1[_a];
        var dks = descriptionPlatformMapping[term];
        if (dks) {
            mergeSet(plats, dks);
        }
    }
    if (plats.size === 0 && entry.ld_issue >= 38) {
        for (var _b = 0, descTerms_2 = descTerms; _b < descTerms_2.length; _b++) {
            var term = descTerms_2[_b];
            var dks = descriptionPlatformMapping[term];
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
    return new Promise(function (resolve, reject) {
        jsdom.JSDOM.fromFile(entryPageFilePath(issue, uid))
            .then(function (jsdom$$1) {
            resolve(jsdom$$1.window.document);
        }, function (err) {
            reject(err);
        });
    });
}
var apiLinkTypeDescription = {
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
    return new Promise(function (resolve, reject) {
        fs.readFile(entryPageFilePath(issue, gid), "utf8", function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                var entryJSON = JSON.parse(data);
                resolve(entryJSON);
            }
        });
    });
}
function userJSONDoc(issue, uid) {
    return new Promise(function (resolve, reject) {
        fs.readFile(userJSONFilePath(issue, uid), "utf8", function (err, data) {
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
    return new Promise(function (resolve, reject) {
        fs.readFile(listingPath(issue), "utf8", function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                var listingJSON = JSON.parse(data);
                resolve(listingJSON);
            }
        });
    });
}
function extractRatings(table) {
    var ratings = [];
    if (table) {
        var trs = [].slice.call(table.querySelectorAll("tr"));
        for (var _i = 0, trs_1 = trs; _i < trs_1.length; _i++) {
            var row = trs_1[_i];
            var tds = row.querySelectorAll("td");
            if (tds.length !== 3) {
                console.info("weird rating table found");
                break;
            }
            var rank = -1;
            var rankString = tds[0].innerHTML.trim();
            var simpleRank = rankString.match(/#(\d+)/);
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
            var area = (tds[1].innerHTML.trim().toLowerCase().replace("(jam)", ""));
            var score = parseFloat(tds[2].innerHTML.trim());
            if (rank > -1 && area.length > 0 && !isNaN(score)) {
                ratings.push({ area: area, rank: rank, score: score });
            }
        }
    }
    return ratings;
}
function createEntry(relURI, issue, uid, thumbImg, doc) {
    var ldBaseURL = "http://ludumdare.com/compo/";
    var eventBaseURL = issueBaseURL(issue);
    var base = doc.querySelector("#compo2");
    if (!base) {
        throw new Error("no base element in page of uid: " + uid);
    }
    var titleElem = base.querySelector("h2");
    var avatarImg = base.querySelector("img.avatar");
    var authorLink = titleElem && titleElem.parentElement.querySelector("a");
    var categoryText = (titleElem && titleElem.parentElement.querySelector("i").textContent) || "";
    var authorName = (authorLink && authorLink.querySelector("strong").textContent) || "";
    var screensArrayElem = base.querySelector(".shot-nav");
    var screensArray = [].slice.call((screensArrayElem && screensArrayElem.querySelectorAll("img")) || []);
    var linksArray = [].slice.call(base.querySelectorAll(".links a"));
    var description = (screensArrayElem && screensArrayElem.nextSibling && screensArrayElem.nextSibling.textContent) || "";
    var ratingTable = base.querySelector("table");
    if ([titleElem, avatarImg, authorLink, categoryText, authorName, screensArrayElem].some(function (t) { return t == null; })) {
        throw new Error("can't get all relevant elements from page source of uid " + uid);
    }
    var categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");
    var entry = {
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
            home_url: ldBaseURL + authorLink.getAttribute("href").substr(3)
        },
        screens: screensArray.map(function (screen) {
            var imgoc = screen.getAttribute("onclick");
            var urls = { thumbnail_url: "", full_url: "" };
            if (imgoc) {
                urls.thumbnail_url = screen.src.replace(/compo2\/\//g, "compo2/");
                urls.full_url = imgoc.substring(imgoc.lastIndexOf("http://"), imgoc.indexOf('")'));
            }
            return urls;
        })
            .filter(function (s) { return s.full_url.length > 0; }),
        links: linksArray.map(function (link) {
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
function resolveLDJImage(imageRef, thumbSize) {
    if (thumbSize === void 0) { thumbSize = "480x384"; }
    var imageRelPath = imageRef.replace("///content", "").replace("///raw", "");
    return {
        thumbnail_url: imageRelPath.length > 0 ? "https://static.jam.vg/content/" + imageRelPath + "." + thumbSize + ".fit.jpg" : "",
        full_url: imageRelPath.length > 0 ? "https://static.jam.vg/raw/" + imageRelPath : ""
    };
}
function extractMDRefs(text) {
    var refs = { links: [], images: [] };
    var matcher = /\!?\[([^\]]*)\]\(([^\)]*)\)/g;
    var links;
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
var deduper = new Set();
function createEntryJSON(issue, apiEntry, apiUser) {
    var doc = apiEntry.node[0];
    var author = apiUser.node[0];
    var eventBaseURL = "https://ldjam.com";
    if (doc.subsubtype === "unfinished" || doc.parent !== issueFeedID(issue)) {
        return undefined;
    }
    var uniqueRef = doc.name + author.id;
    if (deduper.has(uniqueRef)) {
        console.info("skipped duplicate: " + uniqueRef);
        return undefined;
    }
    deduper.add(uniqueRef);
    var refs = extractMDRefs(doc.body);
    var screens = refs.images.map(function (imgRef) { return resolveLDJImage(imgRef); });
    var links = [
        { label: doc.meta["link-01-tag"], url: doc.meta["link-01"] },
        { label: doc.meta["link-02-tag"], url: doc.meta["link-02"] },
        { label: doc.meta["link-03-tag"], url: doc.meta["link-03"] },
        { label: doc.meta["link-04-tag"], url: doc.meta["link-04"] },
        { label: doc.meta["link-05-tag"], url: doc.meta["link-05"] },
    ]
        .filter(function (l) { return l.url !== undefined && l.label !== undefined; })
        .map(function (l) { l.label = apiLinkTypeDescription[l.label] || "Other"; return l; });
    var entry = {
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
        screens: screens,
        links: links,
        ratings: [],
        platforms: []
    };
    entry.platforms = arrayFromSet(detectPlatforms(entry));
    return entry;
}
var MAX_INFLIGHT = 10;
function extractEntryFromPage(state, link, thumb) {
    if (state.issue <= 37) {
        var uid_1 = parseInt(link.substr(link.indexOf("uid=") + 4));
        return entryDoc(state.issue, uid_1)
            .then(function (doc) {
            return createEntry(link, state.issue, uid_1, thumb, doc);
        });
    }
    else {
        var gid = parseInt(link.substr(link.lastIndexOf("/") + 1));
        return entryJSONDoc(state.issue, gid)
            .then(function (entry) {
            return userJSONDoc(state.issue, entry.node[0].author).then(function (user) { return ({ entry: entry, user: user }); });
        })
            .then(function (_a) {
            var entry = _a.entry, user = _a.user;
            return createEntryJSON(state.issue, entry, user);
        });
    }
}
function completed(state) {
    if (state.completionPromise) {
        return state.completionPromise;
    }
    console.info("Extraction complete, writing " + state.entries.length + " entries to catalog file...");
    var catalog = {
        issue: state.issue,
        theme: IssueThemeNames[state.issue],
        stats: state.stats,
        entries: state.entries
    };
    var catalogJSON = JSON.stringify(catalog);
    state.completionPromise = new Promise(function (resolve, reject) {
        fs.writeFile(entriesCatalogPath(state.issue), catalogJSON, function (err) {
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
function updateStats(stats, entry) {
    stats.entries += 1;
    if (entry.category === "compo") {
        stats.compoEntries += 1;
    }
    else {
        stats.jamEntries += 1;
    }
    for (var _i = 0, _a = entry.ratings; _i < _a.length; _i++) {
        var rating = _a[_i];
        if (rating.area in stats.ratingDistribution) {
            stats.ratingDistribution[rating.area] += 1;
        }
        else {
            stats.ratingDistribution[rating.area] = 1;
        }
    }
}
function tryNext(state) {
    var checkDone = function () {
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
        var link_1 = state.source.links.shift();
        var thumb = state.source.thumbs.shift();
        var unqueueSelf_1 = function (prom) {
            var promIx = state.inFlight.indexOf(prom);
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
        var p_1 = extractEntryFromPage(state, link_1, thumb)
            .then(function (entry) {
            if (entry) {
                state.entries.push(entry);
                updateStats(state.stats, entry);
            }
            else {
                state.skippedCount += 1;
            }
            var totalCount = state.source.links.length + state.entries.length + state.skippedCount;
            var curCount = state.entries.length + state.skippedCount;
            if (curCount % 10 === 0) {
                console.info((100 * (curCount / totalCount)).toFixed(1) + "%");
            }
            return unqueueSelf_1(p_1);
        })
            .catch(function (err) {
            console.info("ERROR for " + link_1 + ": ", err);
            return unqueueSelf_1(p_1);
        });
        state.inFlight.push(p_1);
    }
    return timeoutPromise(1).then(function () { return tryNext(state); });
}
function extractEntries(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Extracting entry records for issue " + issue);
    return loadCatalog(issue).then(function (catalogIndex) {
        return tryNext({
            issue: issue,
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

var tasks = new Map();
function task(name, action) {
    tasks.set(name, action);
}
function runTask(name) {
    var task = tasks.get(name);
    if (!task) {
        console.info("unknown task: " + name);
        return;
    }
    return task.apply(global, process.argv.slice(3));
}
function finished() {
    console.info("All tasks done.");
}
function runt() {
    var command = process.argv[2];
    if (!command) {
        var allTasks_1 = [];
        tasks.forEach(function (_, name) { return allTasks_1.push(name); });
        console.info("no task specified, available: " + allTasks_1);
    }
    else {
        var result = runTask(command);
        if (result instanceof Promise) {
            result.then(finished);
        }
        else {
            finished();
        }
    }
}

var MIN_ISSUE = 15;
var MAX_ISSUE = 50;
function getIssueRange(issueSA, issueSB) {
    var issueFrom = issueSA === undefined ? 0 : parseInt(issueSA);
    var issueTo = issueSB === undefined ? issueFrom : parseInt(issueSB);
    if (isNaN(issueFrom) || issueFrom < MIN_ISSUE || issueFrom > MAX_ISSUE || issueTo < issueFrom || issueTo > MAX_ISSUE) {
        console.info("usage: " + process.argv[2] + " <issueFrom: " + MIN_ISSUE + ".." + MAX_ISSUE + "> [<issueTo: " + MIN_ISSUE + ".." + MAX_ISSUE + ">]");
        return undefined;
    }
    return {
        from: issueFrom,
        to: issueTo
    };
}
function rangedTaskPerIssue(f, t, sitFn) {
    var range = getIssueRange(f, t);
    if (range) {
        var issue_1 = range.from - 1;
        var next_1 = function () {
            issue_1 += 1;
            if (issue_1 <= range.to) {
                return sitFn(issue_1).then(next_1);
            }
            else {
                return Promise.resolve();
            }
        };
        return next_1();
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
