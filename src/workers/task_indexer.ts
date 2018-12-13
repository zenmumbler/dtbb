// task_indexer.ts  - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

// this is a WebWorker

import { CatalogPersistence } from "../lib/catalogpersistence";
import { CatalogIndexer } from "../lib/catalogindexer";
import { Request, Response, IndexSuccessResponse } from "../lib/indexerapi";

declare function postMessage(response: Response): void;

let db: CatalogPersistence | undefined;

onmessage = (evt: MessageEvent) => {
	const req = evt.data as Request;

	const error = function(message: string) {
		postMessage({
			status: "error",
			reqIndex: (req && ("reqIndex" in req)) ? req.reqIndex : null,
			message
		});
	};

	if (typeof req === "object" && "what" in req) {
		if (req.what === "open") {
			if (db === undefined) {
				db = new CatalogPersistence();
				postMessage({ status: "success", reqIndex: req.reqIndex });
			}
			else {
				error("Redundant open request");
			}
		}
		else if (req.what === "index") {
			if (db !== undefined) {
				if (typeof req.issue === "number" && req.issue >= 15 && req.issue <= 50) {
					const indexer = new CatalogIndexer(db, "local");
					indexer.onProgress = function(completed, total) {
						if (completed % 100 === 0) {
							postMessage({
								status: "status",
								reqIndex: req.reqIndex,
								progress: completed / total
							});
						}
					};
					indexer.importCatalogFile(req.issue).then(data => {
						postMessage({
							status: "success",
							reqIndex: req.reqIndex,
							entries: data.entries,
							textIndex: data.textIndex.export()
						} as IndexSuccessResponse);
					});
				}
				else {
					error(`Invalid issue number: ${req.issue}`);
				}
			}
			else {
				error("Got an index request without active database.");
			}
		}
		else {
			error(`Unknown request type ${(req as any).what}`);
		}
	}
	else {
		error("Invalid request structure sent to worker: " + JSON.stringify(req));
	}
};
