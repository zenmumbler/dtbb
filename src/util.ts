// util.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function unionSet(dest: Set<number>, other: Set<number>) {
	var union = new Set<number>();
	dest.forEach(index => {
		if (other.has(index)) {
			union.add(index);
		}
	});
	return union;
}

