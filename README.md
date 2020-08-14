Ludum Dare Games Browser
========================

Live at: https://zenmumbler.net/dtbb

This is a website concept I made to quickly search through the many entries submitted for
the [Ludum Dare][ld] game jams. Neither the old nor the new official LD sites are
particularly good at searching through the games.

Site features:

* Search for any number of terms on a full-text index over all text in a submission.
* Filter by download types such as Mac, Win, Linux, HTML5, etc.
* Filter by category (all, compo, jam)
* All filtering is instant, allowing you to play around with search terms freely
* Directly link (in a new tab) to any game that you want to play (links to the LD entry page)
* A horrendous visual design (new designs welcome :stars:)

[Try it now!][dtbb]


Building
--------

In the following, substitute `pnpm` with the package manager you use, I use pnpm.

1. Install dependencies: `pnpm install`
2. To run for development and local testing: `pnpm run dev`
   This will also start a local server with autoreload
3. To build minified production code: `pnpm run build`


Importing Data
--------------

**NOTE WELL**: the _full processed data_ for all supported events is already present in the
`site/data/ldXY_entries.json` files. All of the spidered files (except for thumbnails) are
also present, though zipped, in `import/spider_data/entry_pages`. Unzip these to use them
in the import extraction process. Only mess with the import stuff if you find it interesting
for some reason. 

In the `import` folder run `node import` to get a list of commands available, right now they
are `listing`, `entries`, `thumbs` and `extract`. Each of these commands takes 1 or 2 numbers
as parameters, they are the starting and ending indexes of LD event numbers ("issues") to
process.

`listing 15` gets the entry listing for LD 15.<br>
`entries 20 25` downloads the entry pages for LDs 20 through 25 inclusive.<br>
etc.

`entries` and `thumbs` require the data downloaded by `listing` and `extract` requires the
entry pages downloaded by `entries`. So to download and process all the data you'd do
something like:

    node import listing 15 38
    node import entries 15 38
    node import extract 15 38
    node import thumbs 15 38 (optional)

Note that each of these operations will take quite some time. The scraping happens
sequentially, both for simplicity reasons and not to hammer the LD site too much and a
full extract of all ~35k entries will take around 20-30 minutes.

LDs before #15 did not have a structured submission system in place and are not supported.
The importer supports, for the most part, importing events on the new ldjam.com site
(#38 and newer). The main thing disabled is platform detection, which yielded too many
empties/false positives on the data from the new site.


Details
-------

The site is a client-only web app, there is no server component. It is hosted as an [S3][s3]
static website. The S3 hosted site is then powered by [Cloudflare][cf] which handles caching,
asset compression, minification and other fun stuff. This has the advantage of a very low
cost for me (think cents per month) as I don't have to pay for web hosting or EC2 instances
and it forced me to be creative running everything locally.

So while this project started out mainly to address my frustration with the aging LD website
it changed into a project where I could explore and practice with several web (dev) features
that I had not done much with. So if things are a bit more complex than they need to be for
an app this small, then that's why. To whit, I've made/done the following:

- A full [node-based site scraper][scrape] that retrieves listings and single entry pages
  and extracts out the data from those pages (using jsdom) into JSON catalog files.
- (In 2016) I researched and experimented with most web build systems out there and settled on a
  gulp + rollup combination for code as it is straightforward and it produces clean and
  crud-free output. (total minified app code is only ~33KB)
  In 2020 this was replaced with a [Rollup][rollup]-based build process.
- A cell-reusing scrolling grid view to allow one to scroll through thousands of entries
  without the performance or memory penalties.
- An on-the-fly fulltext search component that can search for ngrams of any length. The
  site limits this to 2 to 12 characters for the sake of index-size. The indexes can
  (de)serialise from/into simple JSON objects.
- The indexer can be used locally or as a WebWorker for asynchronous processing of data
  freeing up the UI thread. A simple API wrapper allows for Promise-based request/response
  usage of the worker.
- A nice [Promise-based typed workflow wrapper around IndexedDB][pdb]. This is used to store
  cached catalog and text index data allowing offline browsing of entries. (NEW) this
  is now a separate project and available as an [NPM package][pdbnpm].
- (In 2016) In lieu of using a big templating engine, I made simple watchable and
  watchablebinding types that encourage the same props-down, methods-up paradigm as
  e.g. [Vue][vue]. The site State employs the same concepts that Vue uses, etc.
  In 2020 I replaced this with a [Svelte][svelte] based site, which still yields ~33KB
  code output.



Disclaimer
----------

The data in [the live site][dtbb] was scraped from the old and new Ludum Dare websites.
DTBB has a full copy of all thumbnails and catalog data hosted on S3.

The platform categorisation of entries is based on their download links and titles.
I tried to be reasonably smart but there may be false positives.

Neither this project nor I are affiliated with or endorsed by Ludum Dare staff. I do
not own or claim to own the data extracted from the LD site. In fact, if you want to make
something cool yourself, use the ldXY-entries.json files in the site/data dir and have
a go.

Now go and [make, play and rate][ld] games.

[dtbb]: https://zenmumbler.net/dtbb/
[ld]: http://ldjam.com/
[pdb]: https://github.com/zenmumbler/promised-db
[pdbnpm]: https://www.npmjs.com/package/promised-db
[ww]: https://github.com/zenmumbler/dtbb/blob/master/src/lib/watchable.ts
[wb]: https://github.com/zenmumbler/dtbb/blob/master/src/app/watchablebinding.ts
[scrape]: https://github.com/zenmumbler/dtbb/tree/master/src/import
[s3]: https://aws.amazon.com/s3/
[cf]: https://www.cloudflare.com/
[vue]: http://vuejs.org/
[ts]: http://www.typescriptlang.org/
[rollup]: https://rollupjs.org/
[svelte]: https://svelte.dev/
