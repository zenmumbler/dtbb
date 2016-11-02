// promisedb.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

type IDBUpgradeCallback = (db: IDBDatabase, fromVersion: number, toVersion: number) => void;

type IDBTransactionMode = "readonly" | "readwrite";
type IDBTransactionRequestFn = (req: IDBRequest, fn?: (req: IDBRequest) => void) => Promise<any>;
interface IDBTransactionContext {
	request: IDBTransactionRequestFn;
	cursor: (container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) => IDBCursorResult<IDBCursorWithValue>;
	keyCursor: (index: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) => IDBCursorResult<IDBCursor>;
	getAll: <T>(container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection, limit?: number) => Promise<T[]>;
	getAllKeys: <K extends IDBValidKey>(index: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection, limit?: number) => Promise<K[]>;
}

type IDBCursorDirection = "next" | "prev" | "nextunique" | "prevunique";

interface IDBCursorResult<C extends IDBCursor> {
	next(callback: (cursor: C) => void): IDBCursorResult<C>;
	complete(callback: () => void): IDBCursorResult<C>;
	catch(callback: (error: any) => void): IDBCursorResult<C>;
}
interface IDBCursorBuilder<C extends IDBCursor> extends IDBCursorResult<C> {
	callbackFn_?: (cursor: C) => void;
	completeFn_?: () => void;
	errorFn_?: (error: any) => void;
}


export class PromiseDB {
	private db_: Promise<IDBDatabase>;
	private tctx_: IDBTransactionContext;

	constructor(name: string, version: number, upgrade: IDBUpgradeCallback) {
		this.db_ = this.request(indexedDB.open(name, version),
			openReq => {
				openReq.onupgradeneeded = upgradeEvt => {
					const db = openReq.result as IDBDatabase;
					upgrade(db, upgradeEvt.oldVersion, upgradeEvt.newVersion || version);
				};
			})
			.catch(error => {
				console.warn(`Failed to open / upgrade database '${name}'`, error);
			});

		this.tctx_ = {
			request: this.request.bind(this),
			cursor: this.cursor.bind(this),
			keyCursor: this.keyCursor.bind(this),
			getAll: this.getAll.bind(this),
			getAllKeys: this.getAllKeys.bind(this)
		};
	}

	close() {
		this.db_.then(db => {
			db.close();
		});
	}

	transaction<T>(storeNames: string | string[], mode: IDBTransactionMode, fn: (tr: IDBTransaction, context: IDBTransactionContext) => Promise<T> | void) {
		return this.db_.then(db => {
			return new Promise<T>((resolve, reject) => {
				const tr = db.transaction(storeNames, mode);
				tr.onerror = () => { reject(tr.error || "transaction failed"); };
				tr.onabort = () => { reject("aborted"); };

				const result = fn(tr, this.tctx_);
				tr.oncomplete = () => { resolve((result === undefined) ? undefined : result); };
			});
		});
	}

	private request<R extends IDBRequest>(req: R, fn?: (req: R) => void): Promise<any> {
		const reqProm = new Promise<any>(function(resolve, reject) {
				req.onerror = () => { reject(req.error || "request failed"); };
				req.onsuccess = () => { resolve(req.result); };

				if (fn) {
					fn(req);
				}
			});

		return this.db_ ? this.db_.then(() => reqProm) : reqProm;
	}

	private cursorImpl<C extends IDBCursor>(cursorReq: IDBRequest): IDBCursorResult<C> {
		const result: IDBCursorBuilder<C> = {
			next: function(this: IDBCursorBuilder<C>, callback: (cursor: C) => void): IDBCursorResult<C> {
				this.callbackFn_ = callback;
				return this;
			},
			complete: function(this: IDBCursorBuilder<C>, callback: () => void): IDBCursorResult<C> {
				this.completeFn_ = callback;
				return this;
			},
			catch: function(this: IDBCursorBuilder<C>, callback: (error: any) => void): IDBCursorResult<C> {
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
			const cursor = cursorReq.result as C | undefined;
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

	private cursor(container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) {
		const cursorReq = container.openCursor(range, direction);
		return this.cursorImpl<IDBCursorWithValue>(cursorReq);
	}

	// IDB 2 has IDBObjectStore.openKeyCursor, but 1 does not
	private keyCursor(index: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection) {
		const cursorReq = index.openKeyCursor(range, direction);
		return this.cursorImpl(cursorReq);
	}

	private getAll<T>(container: IDBIndex | IDBObjectStore, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection, limit?: number) {
		return new Promise<T[]>((resolve, reject) => {
			const result: T[] = [];

			this.cursor(container, range, direction)
				.next(cur => {
					result.push(cur.value as T);
					if (limit && (result.length === limit)) {
						resolve(result);
					}
					else {
						cur.continue();
					}
				})
				.complete(() => {
					resolve(result);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	private getAllKeys<K extends IDBValidKey>(container: IDBIndex, range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection, limit?: number) {
		return new Promise<K[]>((resolve, reject) => {
			const result: K[] = [];

			this.keyCursor(container, range, direction)
				.next(cur => {
					result.push(cur.key as K);
					if (limit && (result.length === limit)) {
						resolve(result);
					}
					else {
						cur.continue();
					}
				})
				.complete(() => {
					resolve(result);
				})
				.catch(error => {
					reject(error);
				});
		});
	}
}
