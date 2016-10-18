// task_loadindex.ts  - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

// this is used as a WebWorker

import { loadTypedJSON } from "util";
import { SerializedTextIndex, TextIndex } from "textindex";

declare function postMessage(msg: any): void;

self.onmessage = (evt: MessageEvent) => {
	const ti = new TextIndex();
	const url = <string>evt.data;

	loadTypedJSON<SerializedTextIndex>(url).then(
		sti => {
			const tpre = Date.now() / 1000;
			ti.load(sti);
			const data = ti.save();
			const tsend = Date.now() / 1000;
			postMessage(JSON.stringify({ tproc: tsend - tpre, tsend: tsend, data: data }));
		},
		err => {
			const tsend = Date.now() / 1000;
			postMessage(JSON.stringify({ tproc: 0, tsend: tsend, data: { "error": err.toString() } }));
		});
};
