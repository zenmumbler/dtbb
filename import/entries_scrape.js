"use strict";
// dtbb scraper.js
// by Arthur Langereis @zenmumbler

var fs = require('fs');
var request = require('request');


const baseURL = "http://ludumdare.com/compo/ludum-dare-35/";
const entriesDir = "entry_pages/";
const entriesPrefix = "entry_";
const entriesPostfix = ".html";
const delayBetweenRequests = 250;


function load(list, index) {
	if (index >= list.length) {
		console.info("done");
		return;
	}

	var link = list[index];
	var uid = link.substr(link.indexOf("uid=") + 4);

	var next = () => {
		console.info((100 * (index / list.length)).toFixed(1) + "%");
		setTimeout(() => { load(list, index + 1); }, delayBetweenRequests);
	};

	request(link, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			fs.writeFile(entriesDir + entriesPrefix + uid + entriesPostfix, body, (err) => {
				if (err) {
					console.log("Failed to write file for uid " + uid, err);
				}
				next();
			});
		}
		else {
			console.log("Failed to load page of uid " + uid, error, response.statusCode);
			next();
		}
	});
}


fs.readFile("catalog.json", "utf8", (err, data) => {
	var json = JSON.parse(data);
	var links = json.links.map(u => baseURL + u);
	
	load(links, 0);
});
