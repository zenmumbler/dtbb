"use strict";
var fs = require("fs");
var jsdom = require("jsdom");
var spiderutil_1 = require("../lib/spiderutil");
function entryDoc(issue, uid) {
    return new Promise(function (resolve, reject) {
        jsdom.env(spiderutil_1.entryPageFilePath(issue, uid), function (errors, window) {
            if (errors && errors.length) {
                reject(errors);
            }
            else {
                resolve(window.document);
            }
        });
    });
}
function loadCatalog(issue) {
    return new Promise(function (resolve, reject) {
        fs.readFile(spiderutil_1.catalogIndexPath(issue), "utf8", function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                var catalogJSON = JSON.parse(data);
                resolve(catalogJSON);
            }
        });
    });
}
function createEntry(relURI, issue, uid, thumbImg, doc) {
    var ldBaseURL = "http://ludumdare.com/compo/";
    var eventBaseURL = spiderutil_1.issueBaseURL(issue);
    var base = doc.querySelector("#compo2");
    if (!base) {
        throw new Error("no base element in page of uid: " + uid);
    }
    var titleElem = base.querySelector("h2");
    var avatarImg = base.querySelector("img.avatar");
    var authorLink = titleElem.parentElement.querySelector("a");
    var categoryText = titleElem.parentElement.querySelector("i").textContent || "";
    var authorName = authorLink.querySelector("strong").textContent || "";
    var screensArrayElem = base.querySelector(".shot-nav");
    var screensArray = [].slice.call(screensArrayElem.querySelectorAll("img"));
    var linksArray = [].slice.call(base.querySelectorAll(".links a"));
    var description = screensArrayElem.nextSibling.textContent || "";
    var categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");
    var entry = {
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
                title: link.textContent || "",
                url: link.getAttribute("href")
            };
        }),
        platform: 0
    };
    return entry;
}
var LDIssue = 0;
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
function extractEntryFromPage(link, thumb) {
    var uid = parseInt(link.substr(link.indexOf("uid=") + 4));
    return entryDoc(LDIssue, uid)
        .then(function (doc) {
        return createEntry(link, LDIssue, uid, thumb, doc);
    });
}
function completed(entries) {
    console.info("Extraction complete, writing " + entries.length + " entries to catalog file...");
    var catalogJSON = JSON.stringify(entries);
    fs.writeFile(spiderutil_1.entriesCatalogPath(LDIssue), catalogJSON, function (err) {
        if (err) {
            console.info("Could not write catalog file: ", err);
        }
        else {
            console.info("Done");
        }
    });
}
var MAX_INFLIGHT = 10;
var inFlight = [];
var isDone = false;
function tryNext(source, catalog) {
    var checkDone = function () {
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
        var link_1 = source.links.shift();
        var thumb = source.thumbs.shift();
        var unqueueSelf_1 = function (prom) {
            var promIx = inFlight.indexOf(prom);
            if (promIx < 0) {
                console.error("Can't find myself in the inFlight array!", inFlight, prom);
                process.abort();
            }
            inFlight.splice(promIx, 1);
            checkDone();
        };
        var p_1 = extractEntryFromPage(link_1, thumb)
            .then(function (entry) {
            catalog.push(entry);
            var totalCount = source.links.length + catalog.length;
            if (catalog.length % 10 === 0) {
                console.info((100 * (catalog.length / totalCount)).toFixed(1) + "%");
            }
            unqueueSelf_1(p_1);
        })
            .catch(function (err) {
            console.info("ERROR for " + link_1 + ": ", err);
            unqueueSelf_1(p_1);
        });
        inFlight.push(p_1);
    }
    setTimeout(function () { tryNext(source, catalog); }, 1);
}
loadCatalog(LDIssue).then(function (catalogIndex) {
    tryNext(catalogIndex, []);
});
