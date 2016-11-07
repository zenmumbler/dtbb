// task_indexer.ts  - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

// this is a WebWorker

import { IndexedEntry } from "../lib/catalog";
import { TextIndex } from "../lib/textindex";
import { CatalogPersistence } from "../lib/catalogpersistence";
import { CatalogIndexer } from "../lib/catalogindexer";

declare function postMessage(response: Response): void;

// ----

interface BasicRequest {
	reqIndex: number;
}

interface OpenRequest extends BasicRequest {
	what: "open";
}

interface IndexRequest extends BasicRequest {
	what: "index";
	issue: number;
}

type Request = OpenRequest | IndexRequest;

// ----

interface BasicResponse {
	reqIndex: number | null;
}

interface SuccessResponse extends BasicResponse {
	status: "success";
}

interface IndexSuccessResponse extends SuccessResponse {
	entries: IndexedEntry[];
	textIndex: TextIndex;
}

interface ErrorResponse extends BasicResponse {
	status: "error";
	message: string;
}

type Response = SuccessResponse | IndexSuccessResponse | ErrorResponse;

// ----

let db: CatalogPersistence | undefined;
let indexer: CatalogIndexer | undefined;

self.onmessage = (evt: MessageEvent) => {
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
				indexer = new CatalogIndexer(db);
				postMessage({ status: "success", reqIndex: req.reqIndex });
			}
			else {
				error("Redundant open request");
			}
		}
		else if (req.what === "index") {
			if (indexer !== undefined) {
				if (typeof req.issue === "number" && req.issue >= 15 && req.issue <= 40) {
					indexer.importCatalogFile(req.issue).then(data => {
						postMessage({
							status: "success",
							reqIndex: req.reqIndex,
							entries: data.entries,
							textIndex: data.textIndex
						});
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
			error(`Unknown request type ${(<any>req).what}`);
		}
	}
	else {
		error("Invalid request structure sent to worker: " + JSON.stringify(req));
	}
};
