// analyze.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { catalog } from "catalog";

function termify(text: string) {
	return text.toLowerCase().replace(/os.x/g, "osx").replace(/[\(\)\/\.\n\r\*\?\-]/g, " ").replace(/ +/g, " ").trim().split(" ").map(term => {
		return term.replace("lve", "love").replace(",", "").replace(/^mac$/, "osx");
	});
}

var linkFeatureMapping: { [key: string]: catalog.EntryFeatures } = {
	download: catalog.EntryFeatures.App,
	love: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.App,
	love2d: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.App,
	standalone: catalog.EntryFeatures.App,

	win: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	win32: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	windows32: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	win64: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	windows64: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	windows: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	exe: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,

	osx: catalog.EntryFeatures.Mac | catalog.EntryFeatures.App,
	macos: catalog.EntryFeatures.Mac | catalog.EntryFeatures.App,
	
	linux: catalog.EntryFeatures.Linux | catalog.EntryFeatures.App,
	ubuntu: catalog.EntryFeatures.Linux | catalog.EntryFeatures.App,

	web: catalog.EntryFeatures.Web,
	html5: catalog.EntryFeatures.Web,
	chrome: catalog.EntryFeatures.Web,
	browser: catalog.EntryFeatures.Web,
	firefox: catalog.EntryFeatures.Web,
	safari: catalog.EntryFeatures.Web,
	webgl: catalog.EntryFeatures.Web,
	online: catalog.EntryFeatures.Web,
	webplayer: catalog.EntryFeatures.Web,
	newgrounds: catalog.EntryFeatures.Web,
	gamejolt: catalog.EntryFeatures.Web,

	java: catalog.EntryFeatures.Java,
	java7: catalog.EntryFeatures.Java,
	java8: catalog.EntryFeatures.Java,
	jar: catalog.EntryFeatures.Java,

	flash: catalog.EntryFeatures.Web,
	swf: catalog.EntryFeatures.Web,

	vr: catalog.EntryFeatures.VR,
	oculus: catalog.EntryFeatures.VR,
	vive: catalog.EntryFeatures.VR,
	cardboard: catalog.EntryFeatures.VR,

	android: catalog.EntryFeatures.Mobile,
	apk: catalog.EntryFeatures.Mobile,
	// google: catalog.EntryFeatures.Mobile,
	ios: catalog.EntryFeatures.Mobile,
};

var descriptionFeatureMapping: { [key: string]: catalog.EntryFeatures } = {
	exe: catalog.EntryFeatures.Win | catalog.EntryFeatures.App,
	wasd: catalog.EntryFeatures.App,
	awsd: catalog.EntryFeatures.App,
	aswd: catalog.EntryFeatures.App,
	love2d: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.App,

	html5: catalog.EntryFeatures.Web,
	chrome: catalog.EntryFeatures.Web,
	firefox: catalog.EntryFeatures.Web,
	safari: catalog.EntryFeatures.Web,

	java: catalog.EntryFeatures.Java | catalog.EntryFeatures.App,
	jar: catalog.EntryFeatures.Java | catalog.EntryFeatures.App,

	flash: catalog.EntryFeatures.Web,
	swf: catalog.EntryFeatures.Web,

	vr: catalog.EntryFeatures.VR,
	oculus: catalog.EntryFeatures.VR,
	vive: catalog.EntryFeatures.VR,
	cardboard: catalog.EntryFeatures.VR,
};


function detectFeatures(entry: catalog.Entry) {
	var feat: catalog.EntryFeatures = 0;

	var descTerms = termify(entry.description);
	var urlTerms = entry.links.map(link => termify(link.title).concat(termify(link.url))).reduce((ta, tn) => ta.concat(tn), []); // func prog style: SO much more legible!

	for (var term of urlTerms) {
		feat |= (linkFeatureMapping[term] | 0);
	}
	for (var term of descTerms) {
		feat |= (descriptionFeatureMapping[term] | 0);
	}

	if (feat == 0) {
		// only use itch as indication for desktop if no other platform tags were applied
		if (urlTerms.indexOf("itch") > -1) {
			feat = catalog.EntryFeatures.App;
		}
		else {
			// console.info("No platform features: ", entry);
		}
	}

	entry.features = feat;
}

export function loadAndAnalyze() {
	return catalog.load().then(data => {
		var t0 = performance.now();
		for (var entry of data) {
			detectFeatures(entry);
		}
		var t1 = performance.now();
		console.info("Classification took " + (t1 - t0).toFixed(1) + "ms");
		return data;
	});
}
