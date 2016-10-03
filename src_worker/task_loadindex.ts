// task_loadindex.ts  - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

// this is used as a WebWorker

import { loadTypedJSON } from "util";
import { SerializedTextIndex, TextIndex } from "textindex";

declare function postMessage(msg: any): void;

self.onmessage = (evt: MessageEvent) => {
	var ti = new TextIndex();
	var url = <string>evt.data;

	loadTypedJSON<SerializedTextIndex>(url).then(sti => {
		var tpre = Date.now() / 1000;
		ti.load(sti);
		var data = ti.save();
		var tsend = Date.now() / 1000;
		postMessage(JSON.stringify({ tproc: tsend - tpre, tsend: tsend, data: data }));
	}, (err) => {
		var tsend = Date.now() / 1000;
		postMessage(JSON.stringify({ tproc: 0, tsend: tsend, data: { "error": err.toString() } }));
	});
};
