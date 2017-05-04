// setutil.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function intersectSet<T>(a: Set<T>, b: Set<T>) {
	const intersection = new Set<T>();
	let tiny: Set<T>;
	let large: Set<T>;

	if (a.size < b.size) {
		[tiny, large] = [a, b];
	}
	else {
		[tiny, large] = [b, a];
	}

	tiny.forEach(val => {
		if (large.has(val)) {
			intersection.add(val);
		}
	});
	return intersection;
}


export function unionSet<T>(a: Set<T>, b: Set<T>) {
	let tiny: Set<T>;
	let large: Set<T>;

	if (a.size < b.size) {
		[tiny, large] = [a, b];
	}
	else {
		[tiny, large] = [b, a];
	}

	const union = new Set<T>(large);
	tiny.forEach(val => {
		union.add(val);
	});
	return union;
}


export function mergeSet<T>(dest: Set<T>, source: Set<T> | T[]) {
	if (source && source.forEach) {
		// some type annotations to soothe TS's worries about forEach being uncallable
		(source.forEach as (callback: (val: T) => void) => void)(val => dest.add(val));
	}
}


export function newSetFromArray<T>(source: T[]) {
	// one would think the constructor from an iterable is faster
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


export function arrayFromSet<T>(source: Set<T>): T[] {
	const arr: T[] = [];
	source.forEach(val => arr.push(val));
	return arr;
}
