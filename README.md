Ludum Dare Games Browser
========================

Live at: https://zenmumbler.net/dtbb

This is a website concept I made to quickly search through the many entries submitted for
the [Ludum Dare][ld] game jams. A new LD site is now nearly done (as per LD37), but the old
site was not great at doing this.

Site features:

* Search for any number of terms on a full-text index over all text in a submission.
* Filter by download types such as Mac, Win, Linux, HTML5, etc.
* Filter by category (all, compo, jam)
* All filtering is instant, allowing you to play around with search terms freely
* Directly link (in a new tab) to any game that you want to play (links to the LD entry page)
* A horrendous visual design (new designs welcome :stars:)

[Try it now!][dtbb]

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
- I researched and experimented with most web build systems out there and settled on a
  gulp + rollup combination for code as it is straightforward and it produces clean and
  crud-free output. (total minified app code is only ~33KB)
- A cell-reusing scrolling grid view to allow one to scroll through thousands of entries
  without the performance or memory penalties.
- An on-the-fly fulltext search component that can search for ngrams of any length. The
  site limits this to 2 to 12 characters for the sake of index-size. The indexes can
  (de)serialise from/into simple JSON objects.
- The indexer can be used locally or as a WebWorker for asynchronous processing of data
  freeing up the UI thread. A simple API wrapper allows for Promise-based request/response
  usage of the worker.
- A nice [Promise-based typed workflow wrapper around IndexedDB][pdb]. This is used to store
  cached catalog and text index data allowing offline browsing of entries.
- In lieu of using a big templating engine, I made simple [watchable][ww] and
  [watchablebinding][wb] types that encourage the same props-down, methods-up paradigm as
  e.g. [Vue][vue]. The site State employs the same concepts that Vue uses, etc.

Disclaimer
----------

The data in [the live site][dtbb] was scraped from the main (now old) Ludum Dare website
most recently in November 2016. DTBB has a full copy of all thumbnails and catalog data
locally.

The platform categorisation of entries is based on their download links and titles.
I tried to be reasonably smart but there may be false positives.

Neither this project nor I are affiliated with or endorsed by Ludum Dare staff. I do
not own or claim to own the data extracted from the LD site. In fact, if you want to make
something cool yourself, use the ldXY-entries.json files in the site/data dir and have
a go.

Now go and [make, play and rate][ld] games.

[dtbb]: https://zenmumbler.net/dtbb/
[ld]: http://ludumdare.com/
[pdb]: https://github.com/zenmumbler/dtbb/blob/master/src/lib/promisedb.ts
[ww]: https://github.com/zenmumbler/dtbb/blob/master/src/lib/watchable.ts
[wb]: https://github.com/zenmumbler/dtbb/blob/master/src/app/watchablebinding.ts
[scrape]: https://github.com/zenmumbler/dtbb/tree/master/src/import
[s3]: https://aws.amazon.com/s3/
[cf]: https://www.cloudflare.com/
[vue]: http://vuejs.org/
