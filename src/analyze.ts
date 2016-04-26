// analyze.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { catalog } from "catalog";

function termify(text: string) {
	return text.toLowerCase().replace(/os.x/g, "osx").replace(/[\(\)\/\.\n\r\*\?\-]/g, " ").replace(/ +/g, " ").trim().split(" ").map(term => {
		return term.replace("lve", "love").replace(",", "").replace(/^mac$/, "osx");
	});
}

var linkFeatureMapping: { [key: string]: catalog.EntryFeatures } = {
	download: catalog.EntryFeatures.Desktop,
	love: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.Desktop,
	love2d: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.Desktop,
	standalone: catalog.EntryFeatures.Desktop,

	win: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	win32: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	windows32: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	win64: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	windows64: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	windows: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	exe: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,

	osx: catalog.EntryFeatures.Mac | catalog.EntryFeatures.Desktop,
	macos: catalog.EntryFeatures.Mac | catalog.EntryFeatures.Desktop,
	
	linux: catalog.EntryFeatures.Linux | catalog.EntryFeatures.Desktop,
	ubuntu: catalog.EntryFeatures.Linux | catalog.EntryFeatures.Desktop,

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

	java: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,
	java7: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,
	java8: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,
	jar: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,

	flash: catalog.EntryFeatures.Web,
	swf: catalog.EntryFeatures.Web,

	vr: catalog.EntryFeatures.VR,
	oculus: catalog.EntryFeatures.VR,
	vive: catalog.EntryFeatures.VR,
	cardboard: catalog.EntryFeatures.VR,

	android: catalog.EntryFeatures.Mobile,
	apk: catalog.EntryFeatures.Mobile,
	google: catalog.EntryFeatures.Mobile,
	ios: catalog.EntryFeatures.Mobile
};

var descriptionFeatureMapping: { [key: string]: catalog.EntryFeatures } = {
	exe: catalog.EntryFeatures.Win | catalog.EntryFeatures.Desktop,
	wasd: catalog.EntryFeatures.Desktop,
	awsd: catalog.EntryFeatures.Desktop,
	aswd: catalog.EntryFeatures.Desktop,
	love2d: catalog.EntryFeatures.Win | catalog.EntryFeatures.Mac | catalog.EntryFeatures.Linux | catalog.EntryFeatures.Desktop,

	html5: catalog.EntryFeatures.Web,
	chrome: catalog.EntryFeatures.Web,
	firefox: catalog.EntryFeatures.Web,
	safari: catalog.EntryFeatures.Web,

	java: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,
	jar: catalog.EntryFeatures.Java | catalog.EntryFeatures.Desktop,

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

	// if (entry.author.uid == 54318) {
	// 	console.info("FG", descTerms, urlTerms);
	// }

	for (var term of urlTerms) {
		feat |= (linkFeatureMapping[term] | 0);
	}
	for (var term of descTerms) {
		feat |= (descriptionFeatureMapping[term] | 0);
	}


	if (feat == 0) {
		// only use itch as indication for desktop if no other platform tags were applied
		if (urlTerms.indexOf("itch") > -1) {
			feat = catalog.EntryFeatures.Desktop;
		}
		else {
			console.info("No platform features: ", entry);
		}
	}

	entry.features = feat;
}

export function loadAndAnalyze() {
	return catalog.load().then(data => {
		for (var entry of data) {
			detectFeatures(entry);
		}
		return data;
	});
}
