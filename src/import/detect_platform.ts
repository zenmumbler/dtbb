// detect_platform.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-7 by Arthur Langereis (@zenmumbler)

import { Entry, PlatformKey } from "../lib/catalog";
import { mergeSet, newSetFromArray } from "../lib/setutil";

const apiPlatformTags = {
	42332: "Source code",
	42336: "HTML5 (web)",
	42337: "Windows",
	42339: "macOS",
	42341: "Linux",
	42342: "Android",
	42346: "iOS",
	42348: "PlayStation (PS1)",
	42349: "PlayStation 2 (PS2)",
	42350: "PlayStation 3 (PS3)",
	42351: "PlayStation 4 (PS4)",
	42352: "PlayStation Portable (PSP)",
	42356: "PlayStation Vita (PS Vita)",
	42361: "Nintendo Entertainment System/Famicom",
	42362: "Super Nintendo/Famicom",
	42365: "Nintendo 64 (N64)",
	42368: "Nintendo GameCube",
	42370: "Nintendo Wii",
	42371: "Nintendo Wii U",
	42372: "Nintendo Switch",
	42374: "Nintendo GameBoy",
	42376: "GameBoy Advance",
	42377: "Nintendo DS",
	42382: "Nintendo 3DS",
	42386: "Sega Master System",
	42387: "Sega Genesis/Mega Drive",
	42389: "Sega Saturn",
	42390: "Sega Dreamcast",
	42391: "Sega Game Gear",
	42392: "Microsoft Xbox",
	42393: "Microsoft Xbox 360",
	42394: "Microsoft Xbox One",
	42398: "Commodore (Other)",
	42400: "Commodore VIC-20",
	42402: "Commodore 64",
	42403: "Commodore 128",
	42405: "Amiga",
	42407: "Atari (other)",
	42408: "Atari 2600",
	42412: "Atari Jaguar",
	42413: "Atari ST",
	42416: "Sinclair (other)",
	42418: "ZX Spectrum",
	42422: "Acorn (other)",
	42424: "BBC Micro",
	42426: "Amstrad (other)",
	42427: "Amstrad CPC",
	42429: "Sega VMU",
	42430: "Sega (other)",
	42432: "Nintendo (other)",
	42433: "Sony (other)",
	42434: "Apple (other)",
	42436: "MSX",
	42437: "Microsoft (other)",
	42438: "Flash (web)",
	42439: "Java (web)",
	42440: "Other (web)",
	42512: "Other (platform)",
	42516: "PDF",
	42517: "Other (document)",
};

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
		if (entry.ld_issue >= 38) {
			const xlks = linkPlatformMapping[term];
			if (xlks) {
				mergeSet(plats, xlks);
			}
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

	// special case Java, remove win/mac/lin nodes
	if (plats.has("java")) {
		plats.delete("win");
		plats.delete("mac");
		plats.delete("linux");
	}

	return plats;
}
