// detect_platform.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Entry, PlatformMask } from "../lib/catalog";

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

const linkPlatformMapping: { [key: string]: PlatformMask } = {
	download: PlatformMask.Desktop,
	love: PlatformMask.Win | PlatformMask.Mac | PlatformMask.Linux | PlatformMask.Desktop,
	love2d: PlatformMask.Win | PlatformMask.Mac | PlatformMask.Linux | PlatformMask.Desktop,
	standalone: PlatformMask.Desktop,

	win: PlatformMask.Win | PlatformMask.Desktop,
	win32: PlatformMask.Win | PlatformMask.Desktop,
	windows32: PlatformMask.Win | PlatformMask.Desktop,
	win64: PlatformMask.Win | PlatformMask.Desktop,
	windows64: PlatformMask.Win | PlatformMask.Desktop,
	windows: PlatformMask.Win | PlatformMask.Desktop,
	exe: PlatformMask.Win | PlatformMask.Desktop,

	osx: PlatformMask.Mac | PlatformMask.Desktop,
	macos: PlatformMask.Mac | PlatformMask.Desktop,

	linux: PlatformMask.Linux | PlatformMask.Desktop,
	ubuntu: PlatformMask.Linux | PlatformMask.Desktop,

	web: PlatformMask.Web,
	html5: PlatformMask.Web,
	chrome: PlatformMask.Web,
	browser: PlatformMask.Web,
	firefox: PlatformMask.Web,
	safari: PlatformMask.Web,
	webgl: PlatformMask.Web,
	online: PlatformMask.Web,
	webplayer: PlatformMask.Web,
	newgrounds: PlatformMask.Web,
	// gamejolt: Platform.Web,

	java: PlatformMask.Java,
	java7: PlatformMask.Java,
	java8: PlatformMask.Java,
	jar: PlatformMask.Java,

	flash: PlatformMask.Web,
	swf: PlatformMask.Web,

	vr: PlatformMask.VR,
	oculus: PlatformMask.VR,
	vive: PlatformMask.VR,
	cardboard: PlatformMask.VR,

	android: PlatformMask.Mobile,
	apk: PlatformMask.Mobile,
	ios: PlatformMask.Mobile,
};

const descriptionPlatformMapping: { [key: string]: PlatformMask } = {
	exe: PlatformMask.Win | PlatformMask.Desktop,
	love2d: PlatformMask.Win | PlatformMask.Mac | PlatformMask.Linux | PlatformMask.Desktop,

	html5: PlatformMask.Web,
	chrome: PlatformMask.Web,
	firefox: PlatformMask.Web,
	safari: PlatformMask.Web,

	java: PlatformMask.Java | PlatformMask.Desktop,
	jar: PlatformMask.Java | PlatformMask.Desktop,

	flash: PlatformMask.Web,
	swf: PlatformMask.Web,

	vr: PlatformMask.VR,
	oculus: PlatformMask.VR,
	vive: PlatformMask.VR,
	cardboard: PlatformMask.VR,
};


export function detectPlatforms(entry: Entry) {
	var plat: PlatformMask = 0;

	const descTerms = termify(entry.description);
	const urlTerms = entry.links
		.map(link =>
			termify(link.label)
			.concat(termify(link.url))
		)
		.reduce((ta, tn) => ta.concat(tn), []);

	for (const term of urlTerms) {
		plat |= (linkPlatformMapping[term] | 0);
	}
	for (const term of descTerms) {
		plat |= (descriptionPlatformMapping[term] | 0);
	}

	if (plat === 0) {
		// last resort, try itch on url and keyboard refs in description to try and add a generic platform
		if (
			(urlTerms.indexOf("itch") > -1) ||
			(descTerms.indexOf("wasd") > -1) ||
			(descTerms.indexOf("awsd") > -1) ||
			(descTerms.indexOf("aswd") > -1)
		) {
			plat = PlatformMask.Desktop;
		}
	}

	return plat;
}
