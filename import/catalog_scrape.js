"use strict";
// dtbb scraper.js
// by Arthur Langereis @zenmumbler

var fs = require('fs');
var request = require('request');

var offset = 0;
const offsetInc = 24;
const maxOffset = offsetInc * 79;

var allLinks = [];
var allThumbs = [];

function next() {
	request("http://ludumdare.com/compo/ludum-dare-36/?action=preview&start=" + offset, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			var links = body.match(/\?action=preview&uid=(\d+)/g);
			var thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);
			links.shift(); // remove hidden "edit self" link

			if (links.length == thumbs.length) {
				allLinks = allLinks.concat(links);
				allThumbs = allThumbs.concat(thumbs);
			}
			else {
				console.info("links/thumbs len mismatch at offset " + offset, links.length, thumbs.length);
				console.info(links);
				console.info("------------")
				console.info(thumbs);
				return;
			}
		}
		else {
			console.log("Fail at offset " + offset, error, response.statusCode);
		}

		offset += offsetInc;
		if (offset <= maxOffset) {
			console.info((100 * (offset / maxOffset)).toFixed(0) + "%");
			setTimeout(next, 100);
		}
		else {
			console.info(JSON.stringify(allLinks));
			console.info(JSON.stringify(allThumbs));
		}
	});
}

next();
