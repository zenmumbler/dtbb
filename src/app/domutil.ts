

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
