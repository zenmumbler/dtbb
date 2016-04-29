// analyze.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Entry, Platform, Catalog } from "catalog";

function termify(text: string) {
	return text.toLowerCase().replace(/os.x/g, "osx").replace(/[\(\)\/\.\n\r\*\?\-]/g, " ").replace(/ +/g, " ").trim().split(" ").map(term => {
		return term.replace("lve", "love").replace(",", "").replace(/^mac$/, "osx");
	});
}

var linkPlatformMapping: { [key: string]: Platform } = {
	download: Platform.Desktop,
	love: Platform.Win | Platform.Mac | Platform.Linux | Platform.Desktop,
	love2d: Platform.Win | Platform.Mac | Platform.Linux | Platform.Desktop,
	standalone: Platform.Desktop,

	win: Platform.Win | Platform.Desktop,
	win32: Platform.Win | Platform.Desktop,
	windows32: Platform.Win | Platform.Desktop,
	win64: Platform.Win | Platform.Desktop,
	windows64: Platform.Win | Platform.Desktop,
	windows: Platform.Win | Platform.Desktop,
	exe: Platform.Win | Platform.Desktop,

	osx: Platform.Mac | Platform.Desktop,
	macos: Platform.Mac | Platform.Desktop,
	
	linux: Platform.Linux | Platform.Desktop,
	ubuntu: Platform.Linux | Platform.Desktop,

	web: Platform.Web,
	html5: Platform.Web,
	chrome: Platform.Web,
	browser: Platform.Web,
	firefox: Platform.Web,
	safari: Platform.Web,
	webgl: Platform.Web,
	online: Platform.Web,
	webplayer: Platform.Web,
	newgrounds: Platform.Web,
	// gamejolt: Platform.Web,

	java: Platform.Java,
	java7: Platform.Java,
	java8: Platform.Java,
	jar: Platform.Java,

	flash: Platform.Web,
	swf: Platform.Web,

	vr: Platform.VR,
	oculus: Platform.VR,
	vive: Platform.VR,
	cardboard: Platform.VR,

	android: Platform.Mobile,
	apk: Platform.Mobile,
	ios: Platform.Mobile,
};

var descriptionPlatformMapping: { [key: string]: Platform } = {
	exe: Platform.Win | Platform.Desktop,
	love2d: Platform.Win | Platform.Mac | Platform.Linux | Platform.Desktop,

	html5: Platform.Web,
	chrome: Platform.Web,
	firefox: Platform.Web,
	safari: Platform.Web,

	java: Platform.Java | Platform.Desktop,
	jar: Platform.Java | Platform.Desktop,

	flash: Platform.Web,
	swf: Platform.Web,

	vr: Platform.VR,
	oculus: Platform.VR,
	vive: Platform.VR,
	cardboard: Platform.VR,
};


function detectPlatform(entry: Entry) {
	var plat: Platform = 0;

	var descTerms = termify(entry.description);
	var urlTerms = entry.links.map(link => termify(link.title).concat(termify(link.url))).reduce((ta, tn) => ta.concat(tn), []); // func prog style: SO much more legible!

	for (var term of urlTerms) {
		plat |= (linkPlatformMapping[term] | 0);
	}
	for (var term of descTerms) {
		plat |= (descriptionPlatformMapping[term] | 0);
	}

	if (plat == 0) {
		// last resort, try itch on url and keyboard refs in description to try and add a generic platform
		if (
			(urlTerms.indexOf("itch") > -1) ||
			(descTerms.indexOf("wasd") > -1) ||
			(descTerms.indexOf("awsd") > -1) ||
			(descTerms.indexOf("aswd") > -1)
		) {
			plat = Platform.Desktop;
		}
		else {
			// console.info("No platform: ", entry);
		}
	}

	return plat;
}

export function classifyEntries(data: Catalog) {
	var t0 = performance.now();
	for (var entry of data) {
		entry.platform = detectPlatform(entry);
	}
	var t1 = performance.now();
	console.info("Classification took " + (t1 - t0).toFixed(1) + "ms");
	return Promise.resolve(data);
}
