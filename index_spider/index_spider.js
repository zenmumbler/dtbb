"use strict";
var fs = require("fs");
var request = require("request");
var spiderutil_1 = require("../lib/spiderutil");
var LD_PAGE_SIZE = 24;
var offset = 0;
var allLinks = [];
var allThumbs = [];
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
function next() {
    request(spiderutil_1.issueBaseURL(LDIssue) + "/?action=preview&start=" + offset, function (error, response, body) {
        var completed = false;
        if (!error && response.statusCode === 200) {
            var links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
            var thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);
            if (links && thumbs) {
                if (links.length === thumbs.length + 1) {
                    links.shift();
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
        if (!completed) {
            offset += LD_PAGE_SIZE;
            console.info("fetched " + allLinks.length + " records...");
            setTimeout(next, 50);
        }
        else {
            console.info("Writing catalog (" + allLinks.length + " entries)...");
            var catalogJSON = JSON.stringify({ links: allLinks, thumbs: allThumbs });
            fs.writeFile(spiderutil_1.catalogIndexPath(LDIssue), catalogJSON, function (err) {
                if (err) {
                    console.error("Failed to write catalog file", err);
                }
                else {
                    console.info("Done.");
                }
            });
        }
    });
}
next();
