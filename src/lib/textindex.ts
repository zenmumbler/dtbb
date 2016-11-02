// textindex.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

// roman scripts only

import { mergeSet, intersectSet, newSetFromArray } from "./setutil";

export type SerializedTextIndex = { [key: string]: number[] };

const DiacriticCharMapping: { [ch: string]: string } = {
	"À": "A", // LATIN CAPITAL LETTER A WITH GRAVE
	"Á": "A", // LATIN CAPITAL LETTER A WITH ACUTE
	"Â": "A", // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"Ã": "A", // LATIN CAPITAL LETTER A WITH TILDE
	"Ä": "A", // LATIN CAPITAL LETTER A WITH DIAERESIS
	"Å": "A", // LATIN CAPITAL LETTER A WITH RING ABOVE

	"Ç": "C", // LATIN CAPITAL LETTER C WITH CEDILLA

	"È": "E", // LATIN CAPITAL LETTER E WITH GRAVE
	"É": "E", // LATIN CAPITAL LETTER E WITH ACUTE
	"Ê": "E", // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"Ë": "E", // LATIN CAPITAL LETTER E WITH DIAERESIS

	"Ì": "I", // LATIN CAPITAL LETTER I WITH GRAVE
	"Í": "I", // LATIN CAPITAL LETTER I WITH ACUTE
	"Î": "I", // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"Ï": "I", // LATIN CAPITAL LETTER I WITH DIAERESIS

	"Ñ": "N", // LATIN CAPITAL LETTER N WITH TILDE

	"Ò": "O", // LATIN CAPITAL LETTER O WITH GRAVE
	"Ó": "O", // LATIN CAPITAL LETTER O WITH ACUTE
	"Ô": "O", // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"Õ": "O", // LATIN CAPITAL LETTER O WITH TILDE
	"Ö": "O", // LATIN CAPITAL LETTER O WITH DIAERESIS
	"Ø": "O", // LATIN CAPITAL LETTER O WITH STROKE

	"Ù": "U", // LATIN CAPITAL LETTER U WITH GRAVE
	"Ú": "U", // LATIN CAPITAL LETTER U WITH ACUTE
	"Û": "U", // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"Ü": "U", // LATIN CAPITAL LETTER U WITH DIAERESIS

	"Ý": "Y", // LATIN CAPITAL LETTER Y WITH ACUTE

	"ß": "ss", // LATIN SMALL LETTER SHARP S

	"à": "a", // LATIN SMALL LETTER A WITH GRAVE
	"á": "a", // LATIN SMALL LETTER A WITH ACUTE
	"â": "a", // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"ã": "a", // LATIN SMALL LETTER A WITH TILDE
	"ä": "a", // LATIN SMALL LETTER A WITH DIAERESIS
	"å": "a", // LATIN SMALL LETTER A WITH RING ABOVE

	"ç": "c", // LATIN SMALL LETTER C WITH CEDILLA
	"è": "e", // LATIN SMALL LETTER E WITH GRAVE
	"é": "e", // LATIN SMALL LETTER E WITH ACUTE
	"ê": "e", // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"ë": "e", // LATIN SMALL LETTER E WITH DIAERESIS
	"ì": "i", // LATIN SMALL LETTER I WITH GRAVE
	"í": "i", // LATIN SMALL LETTER I WITH ACUTE
	"î": "i", // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"ï": "i", // LATIN SMALL LETTER I WITH DIAERESIS

	"ñ": "n", // LATIN SMALL LETTER N WITH TILDE
	"ò": "o", // LATIN SMALL LETTER O WITH GRAVE
	"ó": "o", // LATIN SMALL LETTER O WITH ACUTE
	"ô": "o", // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"õ": "o", // LATIN SMALL LETTER O WITH TILDE
	"ö": "o", // LATIN SMALL LETTER O WITH DIAERESIS
	"ø": "o", // LATIN SMALL LETTER O WITH STROKE

	"ù": "u", // LATIN SMALL LETTER U WITH GRAVE
	"ú": "u", // LATIN SMALL LETTER U WITH ACUTE
	"û": "u", // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"ü": "u", // LATIN SMALL LETTER U WITH DIAERESIS

	"ý": "y", // LATIN SMALL LETTER Y WITH ACUTE
	"ÿ": "y", // LATIN SMALL LETTER Y WITH DIAERESIS
};

const InvalidCharsMatcher = /[^a-zA-Z0-9ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/g;

const DiacriticsMatcher = /[ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/;
const DiacriticCharMatchers: { [c: string]: RegExp } = {};
Object.keys(DiacriticCharMapping).forEach(c => DiacriticCharMatchers[c] = new RegExp(c, "g"));


export class TextIndex {
	private data_ = new Map<string, Set<number>>();
	private wordNGramCache_ = new Map<string, Set<string>>();

	private readonly MIN_NGRAM_LENGTH = 2;
	private readonly MAX_NGRAM_LENGTH = 12;

	export() {
		const json: SerializedTextIndex = {};

		this.data_.forEach((indexes, key) => {
			const flatIndexes: number[] = [];
			indexes.forEach(index => flatIndexes.push(index));
			json[key] = flatIndexes;
		});

		return json;
	}

	import(index: TextIndex | SerializedTextIndex) {
		if (index instanceof TextIndex) {
			index.data_.forEach((indexes, key) => {
				if (this.data_.has(key)) {
					mergeSet(this.data_.get(key)!, indexes);
				}
				else {
					this.data_.set(key, indexes);
				}
			});
		}
		else {
			for (const key in index) {
				if (this.data_.has(key)) {
					mergeSet(this.data_.get(key)!, index[key]);
				}
				else {
					this.data_.set(key, newSetFromArray(index[key]));
				}
			}
		}
	}

	get ngramCount() {
		return this.data_.size;
	}

	private wordNGrams(word: string) {
		if (this.wordNGramCache_.has(word)) {
			return this.wordNGramCache_.get(word)!;
		}
		else {
			const wordLen = word.length;
			const ngrams = new Set<string>();

			for (let l = this.MIN_NGRAM_LENGTH; l <= this.MAX_NGRAM_LENGTH; ++l) {
				if (l > wordLen) {
					break;
				}

				const maxO = wordLen - l;
				for (let o = 0; o <= maxO; ++o) {
					const ss = word.substr(o, l);
					if (! ngrams.has(ss)) {
						ngrams.add(ss);
					}
				}
			}

			this.wordNGramCache_.set(word, ngrams);
			return ngrams;
		}
	}

	private stripDiacritics(term: string) {
		var r: RegExpMatchArray | null;
		// if a mapped character appears anywhere in the term, replace all occurances at once
		while (r = term.match(DiacriticsMatcher)) {
			const mc = term[r.index!];
			term = term.replace(DiacriticCharMatchers[mc], DiacriticCharMapping[mc]);
		}
		return term;
	}

	private readonly collapsedPunctuationMatcher = /['-]/g;
	private readonly multipleSpacesMatcher = / +/g;

	private tokenizeString(s: string) {
		const cs = s.toLowerCase().replace(this.collapsedPunctuationMatcher, "").replace(InvalidCharsMatcher, " ").replace(this.multipleSpacesMatcher, " ").trim();
		const tokens = cs.split(" ");
		return newSetFromArray(tokens); // automatically deduplicates
	}

	indexRawString(rs: string, ref: number) {
		const boxedRef = [ref];
		const tokenSet = this.tokenizeString(rs);
		tokenSet.forEach(token => {
			token = this.stripDiacritics(token);
			const ngrams = this.wordNGrams(token);
			ngrams.forEach(ngram => {
				if (! this.data_.has(ngram)) {
					this.data_.set(ngram, newSetFromArray(boxedRef));
				}
				else {
					this.data_.get(ngram)!.add(ref);
				}
			});
		});
	}

	query(qs: string): Set<number> | null {
		const qt = this.tokenizeString(qs);
		const termIndexSets: Set<number>[] = [];
		var hasEmptyResult = false;
		qt.forEach(term => {
			if (term.length < this.MIN_NGRAM_LENGTH) {
				return;
			}
			if (term.length > this.MAX_NGRAM_LENGTH) {
				term = term.substr(0, this.MAX_NGRAM_LENGTH);
			}

			term = this.stripDiacritics(term);
			if (this.data_.has(term)) {
				termIndexSets.push(this.data_.get(term)!);
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
		termIndexSets.sort((a, b) => { return a.size < b.size ? -1 : 1; });
		var result = new Set(termIndexSets[0]);
		for (let tisix = 1; tisix < termIndexSets.length; ++tisix) {
			result = intersectSet(result, termIndexSets[tisix]);
		}

		return result;
	}
}
