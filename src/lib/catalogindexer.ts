// catalogindexer.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Catalog, IndexedEntry, maskForPlatformKeys } from "../lib/catalog";
import { CatalogPersistence } from "../lib/catalogpersistence";
import { TextIndex } from "../lib/textindex";

function loadTypedJSON<T>(url: string): Promise<T> {
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

function makeDocID(issue: number, entryIndex: number) {
	// this imposes a limit of 65536 entries per issue
	return (issue << 16) | entryIndex;
}

export interface IndexedCatalogData {
	entries: IndexedEntry[];
	textIndex: TextIndex;
}

export class CatalogIndexer {
	constructor(private persist_: CatalogPersistence) {
	}

	private acceptCatalogData(catalog: Catalog): IndexedCatalogData {
		const entries = catalog.entries.map(entry => {
			const indEntry = entry as IndexedEntry;
			indEntry.indexes = {
				platformMask: 0
			};
			return indEntry;
		});

		// index catalog
		const count = entries.length;
		const textIndex = new TextIndex();
		for (let entryIndex = 0; entryIndex < count; ++entryIndex) {
			const entry = entries[entryIndex];
			const docID = makeDocID(catalog.issue, entryIndex);
			entry.docID = docID;
			entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);

			// index text of entry
			textIndex.indexRawString(entry.title, docID);
			textIndex.indexRawString(entry.author.name, docID);
			textIndex.indexRawString(entry.description, docID);
			for (const link of entry.links) {
				textIndex.indexRawString(link.label, docID);
			}
		}

		// persist indexed catalog in local db
		this.storeCatalog(catalog, entries, textIndex);

		// return processed entries and textindex for caching etc.
		return {
			entries,
			textIndex
		};
	}

	private storeCatalog(catalog: Catalog, indexedEntries: IndexedEntry[], textIndex: TextIndex) {
		this.persist_.saveCatalog(catalog, indexedEntries, textIndex.export())
			.then(() => {
				console.info(`saved issue ${catalog.issue}`);
			});
	}

	importCatalogFile(issue: number) {
		const revision = 1;
		const extension = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
		const entriesURL = `data/ld${issue}_entries${extension}?${revision}`;

		return loadTypedJSON<Catalog>(entriesURL).then(catalog => {
			return this.acceptCatalogData(catalog);
		});
	}
}
