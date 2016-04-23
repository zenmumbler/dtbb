// analyze.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { catalog } from "catalog";

function cleanTitle(title: string) {
	return title.replace(/[\(\)\/]/g, " ").replace(/ +/g, " ").replace(/\./g, "").trim();
}

var termFeatureMapping: { [key: string]: catalog.EntryFeatures } = {
	windows: catalog.EntryFeatures.Win,
	exe: catalog.EntryFeatures.Win,

	osx: catalog.EntryFeatures.Mac,
	linux: catalog.EntryFeatures.Linux,

	html5: catalog.EntryFeatures.HTML5,
	chrome: catalog.EntryFeatures.HTML5,
	browser: catalog.EntryFeatures.HTML5,

	webgl: catalog.EntryFeatures.WebGL | catalog.EntryFeatures.HTML5,

	unity: catalog.EntryFeatures.Unity,

	java: catalog.EntryFeatures.Java,
	jar: catalog.EntryFeatures.Java,

	love: catalog.EntryFeatures.Love,

	flash: catalog.EntryFeatures.Flash,
	swf: catalog.EntryFeatures.Flash,

	vr: catalog.EntryFeatures.VR,
	oculus: catalog.EntryFeatures.VR,
	vive: catalog.EntryFeatures.VR,
	cardboard: catalog.EntryFeatures.VR,

	android: catalog.EntryFeatures.Mobile,
	apk: catalog.EntryFeatures.Mobile,
	ios: catalog.EntryFeatures.Mobile,

	source: catalog.EntryFeatures.Source,
	github: catalog.EntryFeatures.Source
};


function detectFeatures(entry: catalog.Entry) {
	var feat: catalog.EntryFeatures = 0;
	var isDownload = false;

	for (var link of entry.links) {
		var clean = cleanTitle(link.title.toLowerCase().replace(/os.x/g, "osx"));
		var terms = clean.split(" ");
		var url = link.url.toLowerCase();

		// basic url-based detection
		if (url.indexOf("webgl") > -1) {
			feat |= catalog.EntryFeatures.WebGL | catalog.EntryFeatures.HTML5;
		}
		else if (url.indexOf("swf") > -1) {
			feat |= catalog.EntryFeatures.Flash;
		}
		else if (url.indexOf(".jar") > -1) {
			feat |= catalog.EntryFeatures.Java;
		}
		else if ((url.indexOf("unity") > -1) || (url.indexOf("webplayer") > -1)) {
			feat |= catalog.EntryFeatures.Unity;
		}

		// try and map link terms to features
		for (var term of terms) {
			term = term.replace("lve", "love").replace(",", "").replace(/^mac$/, "osx").replace(/^win$/, "windows");

			if (term == "web") {
				if ((url.indexOf("?dl=") > -1) || (url.indexOf("github.com") > -1) || (url.indexOf("itch.io/") > -1)) {
					isDownload = true;
				}
			}
			else {
				feat |= (termFeatureMapping[term] | 0);
			}
		}
	}

	if (entry.links.length > 0) {
		if (feat == 0 || feat == catalog.EntryFeatures.Source) {
			if (isDownload) {
				// assume windows
				feat = catalog.EntryFeatures.Win;
			}
			else {
				// assume html5
				feat = catalog.EntryFeatures.HTML5;
			}
		}
	}
	else {
		// console.info("Empty", entry);
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
