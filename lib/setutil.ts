// setutil.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function intersectSet<T>(dest: Set<T>, other: Set<T>) {
	const union = new Set<T>();
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
