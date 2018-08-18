// fileutil.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function loadTypedJSON<T>(url: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.overrideMimeType("application/json");
		xhr.responseType = "json";
		xhr.onload = function() {
			resolve(xhr.response as T);
		};
		xhr.onerror = reject;
		xhr.send();
	});
}
