// promisedb.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export type IDBUpgradeCallback = (db: IDBDatabase, fromVersion: number, toVersion: number) => void;

export type IDBTransactionMode = "readonly" | "readwrite";
export type IDBTransactionRequestFn = (req: IDBRequest, fn?: (req: IDBRequest) => void) => Promise<any>;
export interface IDBTransactionContext {
	request: IDBTransactionRequestFn;
	cursor: (container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) => IDBCursorResult;
	keyCursor: (index: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) => IDBCursorResult;
}

export type IDBCursorDirection = "next" | "prev" | "nextunique" | "prevunique";
export type IDBCursorCallback = (cursor: IDBCursorWithValue) => void;
export interface IDBCursorResult {
	next(callback: IDBCursorCallback): IDBCursorResult;
	complete(callback: () => void): IDBCursorResult;
	catch(callback: (error: any) => void): IDBCursorResult;
}
interface IDBCursorBuilder extends IDBCursorResult {
	callbackFn_?: IDBCursorCallback;
	completeFn_?: () => void;
	errorFn_?: (error: any) => void;
}


export class PromiseDB {
	private db_: Promise<IDBDatabase>;
	private tctx_: IDBTransactionContext;

	constructor(name: string, version = 1, upgrade: IDBUpgradeCallback) {
		this.db_ = this.request(indexedDB.open(name, version),
			openReq => {
				openReq.onupgradeneeded = upgradeEvt => {
					const db = openReq.result as IDBDatabase;
					upgrade(db, upgradeEvt.oldVersion, upgradeEvt.newVersion || version);
				};
			});

		this.tctx_ = {
			request: this.request.bind(this),
			cursor: this.cursor.bind(this),
			keyCursor: this.keyCursor.bind(this)
		};
	}

	transaction(storeNames: string | string[], mode: IDBTransactionMode, fn: (tr: IDBTransaction, context: IDBTransactionContext) => void) {
		return this.db_.then(db => {
			return new Promise<IDBTransaction>((resolve, reject) => {
				const tr = db.transaction(storeNames, mode);
				tr.onerror = _ => { reject(tr.error || "transaction failed"); };
				tr.onabort = _ => { reject("aborted"); };
				tr.oncomplete = _ => { resolve(tr); };

				fn(tr, this.tctx_);
			});
		});
	}

	request<R extends IDBRequest>(req: R, fn?: (req: R) => void): Promise<any> {
		const reqProm = new Promise<any>(function(resolve, reject) {
				req.onerror = () => { reject(req.error || "request failed"); };
				req.onsuccess = () => { resolve(req.result); };

				if (fn) {
					fn(req);
				}
			});

		return this.db_ ? this.db_.then(_ => reqProm) : reqProm;
	}

	private cursorImpl(cursorReq: IDBRequest): IDBCursorResult {
		const result: IDBCursorBuilder = {
			next: function(this: IDBCursorBuilder, callback: IDBCursorCallback): IDBCursorResult {
				this.callbackFn_ = callback;
				return this;
			},
			complete: function(this: IDBCursorBuilder, callback: () => void): IDBCursorResult {
				this.completeFn_ = callback;
				return this;
			},
			catch: function(this: IDBCursorBuilder, callback: (error: any) => void): IDBCursorResult {
				this.errorFn_ = callback;
				return this;
			}
		};

		cursorReq.onerror = function() {
			if (result.errorFn_) {
				result.errorFn_(cursorReq.error);
			}
		};
		cursorReq.onsuccess = function() {
			const cursor = cursorReq.result as IDBCursorWithValue | undefined;
			if (cursor) {
				if (result.callbackFn_) {
					result.callbackFn_(cursor);
				}
			}
			else {
				if (result.completeFn_) {
					result.completeFn_();
				}
			}
		};

		return result;
	}

	cursor(container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBCursorResult {
		const cursorReq = container.openCursor(range, direction);
		return this.cursorImpl(cursorReq);
	}

	keyCursor(index: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBCursorResult {
		const cursorReq = index.openKeyCursor(range, direction);
		return this.cursorImpl(cursorReq);
	}

	get idb() { return this.db_; }
}
