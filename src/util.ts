// util.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)


export function loadTypedJSON<T>(url: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.overrideMimeType("application/json; charset=utf-8");
		xhr.responseType = "json";
		xhr.open("GET", url);
		xhr.onload = function() {
			resolve(<T>xhr.response);
		};
		xhr.onerror = reject;
		xhr.send(null);
	});
}


export function unionSet(dest: Set<number>, other: Set<number>) {
	var union = new Set<number>();
	dest.forEach(index => {
		if (other.has(index)) {
			union.add(index);
		}
	});
	return union;
}

