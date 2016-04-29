// util.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function loadTypedJSON<T>(url: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.overrideMimeType("application/json");
		xhr.responseType = "json";
		xhr.onload = function() {
			resolve(<T>xhr.response);
		};
		xhr.onerror = reject;
		xhr.send(null);
	});
}


export function elem<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return <T>(base.querySelector(sel));
}


export function elemList<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return <T[]>([].slice.call(document.querySelectorAll(sel), 0));
}


export function intersectSet(dest: Set<number>, other: Set<number>) {
	var union = new Set<number>();
	dest.forEach(index => {
		if (other.has(index)) {
			union.add(index);
		}
	});
	return union;
}

