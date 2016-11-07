// indexerapi.ts  - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { IndexedEntry } from "../lib/catalog";
import { SerializedTextIndex } from "../lib/textindex";


// ---- Requests

export interface BasicRequest {
	reqIndex: number;
}

export interface OpenRequest extends BasicRequest {
	what: "open";
}

export interface IndexRequest extends BasicRequest {
	what: "index";
	issue: number;
}

export type Request = OpenRequest | IndexRequest;


// ---- Responses

interface BasicResponse {
	reqIndex: number | null;
}

export interface SuccessResponse extends BasicResponse {
	status: "success";
}

export interface IndexSuccessResponse extends SuccessResponse {
	entries: IndexedEntry[];
	textIndex: SerializedTextIndex;
}

export interface ErrorResponse extends BasicResponse {
	status: "error";
	message: string;
}

export type Response = SuccessResponse | IndexSuccessResponse | ErrorResponse;


// ---- API

export class IndexerAPI {
	private worker_: Worker;
	private promFuncs_ = new Map<number, { resolve: (value?: Response | PromiseLike<Response>) => void, reject: (reason?: ErrorResponse) => void }>();
	private nextIndex_ = 0;

	constructor() {
		this.worker_ = new Worker("workers/task_indexer.js");

		this.worker_.onerror = event => {
			console.warn(`An internal error occurred inside the indexer task: ${event.error} @ ${event.lineno}:${event.colno}`);
		};

		this.worker_.onmessage = event => {
			const response = event.data as Response;
			if (response && typeof response.status === "string" && typeof response.reqIndex === "number") {
				const funcs = this.promFuncs_.get(response.reqIndex);
				if (funcs) {
					console.info(`IndexerAPI: received valid response for request #${response.reqIndex}`, response);
					if (response.status === "success") {
						funcs.resolve(response);
					}
					else {
						funcs.reject(response);
					}
					this.promFuncs_.delete(response.reqIndex!);
				}
				else {
					console.warn(`IndexerAPI: Cannot find the functions for request #${response.reqIndex}`);
				}
			}
			else {
				console.warn(`IndexerAPI: Got an invalid response from the server: ${response}`);
			}
		};
	}

	private promisedCall<T extends Response>(req: Request) {
		return new Promise<T>((resolve, reject) => {
			this.promFuncs_.set(req.reqIndex, { resolve, reject });
			this.worker_.postMessage(req);
		});
	}

	open() {
		this.nextIndex_ += 1;
		const req: OpenRequest = {
			what: "open",
			reqIndex: this.nextIndex_
		};
		return this.promisedCall(req);
	}

	index(issue: number) {
		this.nextIndex_ += 1;
		const req: IndexRequest = {
			what: "index",
			reqIndex: this.nextIndex_,
			issue
		};
		return this.promisedCall<IndexSuccessResponse>(req);
	}
}
