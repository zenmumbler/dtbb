// util.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function loadTypedJSON<T>(url: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
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
	return <T[]>([].slice.call(base.querySelectorAll(sel), 0));
}


export function intersectSet(dest: Set<number>, other: Set<number>) {
	const union = new Set<number>();
	dest.forEach(index => {
		if (other.has(index)) {
			union.add(index);
		}
	});
	return union;
}


export function newSetFromArray<T>(source: T[]) {
	// one would think the instructor from an iterable is faster
	// than just looping over it and doing 100s of 1000s of function calls
	// on Safari and Chrome, one would be wrong.

	// this func does the equivalent of:
	// new Set<T>(source);

	const set = new Set<T>();
	const len = source.length;
	for (let vi = 0; vi < len; ++vi) {
		set.add(source[vi]);
	}

	return set;
}
