// util.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)


export function loadTypedJSON<T>(url: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.overrideMimeType("application/json");
		// xhr.responseType = "json";
		xhr.open("GET", url);
		xhr.onload = function() {
			var txt = xhr.responseText;
			var sigh = txt.indexOf("nther's Abduction");
			var xx = txt.substring(sigh - 10, sigh + 40);
			console.info(xx);
			var json = JSON.parse(txt);
			resolve(<T>json);
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

