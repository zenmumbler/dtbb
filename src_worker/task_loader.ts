// task_loader.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

importScripts("require.js");

declare function postMessage(msg: any): void;

self.onmessage = (evt: MessageEvent) => {
	self.onmessage = undefined;
	const modName = <string>evt.data;
	require([modName], () => {
		postMessage("loaded");
	});
};
