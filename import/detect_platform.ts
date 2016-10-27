// detect_platform.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Entry, PlatformKey } from "../lib/catalog";
import { newSetFromArray, mergeSet } from "../lib/setutil";

function termify(text: string) {
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

function pks(keys: PlatformKey[]): Set<PlatformKey> {
	return newSetFromArray(keys);
}

const linkPlatformMapping: { [term: string]: Set<PlatformKey> | undefined } = {
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

const descriptionPlatformMapping: { [term: string]: Set<PlatformKey> | undefined } = {
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


export function detectPlatforms(entry: Entry) {
	const plats = new Set<PlatformKey>();

	const descTerms = termify(entry.description);
	const urlTerms = entry.links
		.map(link =>
			termify(link.label)
			.concat(termify(link.url))
		)
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

	if (plats.size === 0) {
		// last resort, try itch on url and keyboard refs in description to try and add a generic platform
		if (
			(urlTerms.indexOf("itch") > -1) ||
			(descTerms.indexOf("wasd") > -1) ||
			(descTerms.indexOf("awsd") > -1) ||
			(descTerms.indexOf("aswd") > -1)
		) {
			plats.add("desktop");
		}
	}

	return plats;
}
