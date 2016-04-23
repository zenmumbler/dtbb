// textindex.ts - english script - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { unionSet } from "util";

export type SerializedTextIndex = { [key: string]: number[] };

export class TextIndex {
	private data_ = new Map<string, Set<number>>();
	private wordNGramCache_ = new Map<string, Set<string>>();

	private MIN_NGRAM_LENGTH = 2;
	private MAX_NGRAM_LENGTH = 12;

	constructor() {
	}

	save() {
		var json: SerializedTextIndex = {};

		this.data_.forEach((indexes, key) => {
			var flatIndexes: number[] = [];
			indexes.forEach(index => flatIndexes.push(index));
			json[key] = flatIndexes;
		});

		return json;
	}

	load(sti: SerializedTextIndex) {
		this.data_ = new Map<string, Set<number>>();
		for (var key in sti) {
			this.data_.set(key, new Set<number>(sti[key]));
		}
	}

	get ngramCount() {
		return this.data_.size;
	}

	wordNGrams(word: string) {
		if (this.wordNGramCache_.has(word)) {
			return this.wordNGramCache_.get(word);
		}
		else {
			var wordLen = word.length;
			var ngrams = new Set<string>();

			for (var l = this.MIN_NGRAM_LENGTH; l <= this.MAX_NGRAM_LENGTH; ++l) {
				if (l > wordLen) {
					break;
				}

				var maxO = wordLen - l;
				for (var o = 0; o <= maxO; ++o) {
					var ss = word.substr(o, l);
					if (! ngrams.has(ss)) {
						ngrams.add(ss);
					}
				}
			}

			this.wordNGramCache_.set(word, ngrams);
			return ngrams;
		}
	}

	tokenizeString(s: string) {
		var cs = s.toLowerCase().replace(/['-]/g, "").replace(/[^a-z0-9]/g, " ").replace(/ +/g, " ").trim();
		var tokens = cs.split(" ");
		return new Set<string>(tokens); // automatically deduplicates
	}

	indexRawString(rs: string, ref: number) {
		var boxedRef = [ref];
		var tokenSet = this.tokenizeString(rs);
		tokenSet.forEach(token => {
			var ngrams = this.wordNGrams(token);
			ngrams.forEach(ngram => {
				if (! this.data_.has(ngram)) {
					this.data_.set(ngram, new Set<number>(boxedRef));
				}
				else {
					this.data_.get(ngram).add(ref);
				}
			});
		});
	}

	query(qs: string): Set<number> {
		var qt = this.tokenizeString(qs);
		var termIndexSets: Set<number>[] = [];
		var hasEmptyResult = false;
		qt.forEach(term => {
			if (term.length < this.MIN_NGRAM_LENGTH) {
				return;
			}
			if (term.length > this.MAX_NGRAM_LENGTH) {
				term = term.substr(0, this.MAX_NGRAM_LENGTH);
			}
			if (this.data_.has(term)) {
				termIndexSets.push(this.data_.get(term));
			}
			else {
				hasEmptyResult = true;
			}
		});

		// if any valid serch term yielded no results, return empty result immediately
		if (hasEmptyResult) {
			return new Set<number>();
		}

		// no valid search terms
		if (termIndexSets.length == 0) {
			return null;
		}

		// start with smallest result set
		termIndexSets.sort((a, b) => { return a.size < b.size ? -1 : 1 });
		var result = new Set(termIndexSets[0]);
		for (var tisix = 1; tisix < termIndexSets.length; ++tisix) {
			result = unionSet(result, termIndexSets[tisix]);
		}

		return result;
	}

	get data() { return this.data_; }
}
