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


Building
--------

If you want to try this locally then host the `site` directory using your manner of choice.
I just have it symlinked as `/Library/WebServer/Documents/dtbb` on macOS. The repo includes
the built js and css files so you can try it immediately.

To modify things, you'll need to install some packages, run `yarn` or `npm install` inside
the main directory. All the code is written in [TypeScript][ts] and it is assumed you have
TS 2.x installed globally. I keep TS updated to whatever RC or release version is available
which currently is 2.1.1. TS 2.0 is currently the minimum supported version.

There are 3 targets in this project: the main site code, the worker and the import node app.
I compile the code inside Sublime Text using the [TypeScript package][stts]. This code ends
up either in `site/build/app/`, `site/build/workers/` or `import/build/` depending on what
you compiled. I've got a gulp task running to watch these dirs that will package them up
as single JS files. Run `gulp watch` in a terminal while developing or run `gulp site` to
explicitly rebuild all site related things or `gulp import` to rebuild the import code.

The site styles are contained in `scss` files inside `site/views` with `dtbb.scss` being the
entrypoint. `gulp watch` includes rebuilding the css or run `gulp styles` manually.

### Import code caveat

The import script uses the `request` and `mkdirp` packages with corresponding typings in
`@types/request` and `@types/mkdirp`. Sadly, these packages export the functions using
`export = func;` and what I need (mostly for rollup to not complain) is
`export default func`.

I messed around for a while while with various workarounds but I've spent way too
much time on this side-project already so I just modified the `index.d.ts` files inside
the packages themselves. Until you do this you won't be able to fully build the import
script. If you feel like fixing this, be my guest.


Importing Data
--------------

**NOTE WELL**: the _full processed data_ for all supported events is already present in the
`site/data/ldXY_entries.json` files. Only mess with this import stuff if you find it
interesting for some reason.

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

    node import listing 15 36
    node import entries 15 36
    node import thumbs 15 36
    node import extract 15 36

Note that each of these operations will take quite some time. The scraping happens
sequentially, both for simplicity reasons and not to hammer the LD site too much and a
full extract of all ~35k entries will take around 20-30 minutes.

Given that PoV has announced that new events will be hosted on a new server with new visual
design etc. that means that until this scraper code is updated it will only work for LD
issues 15 through 36. LDs before #15 did not have a structured submission system in place and
are not supported.


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
[ts]: http://www.typescriptlang.org/
[stts]: https://packagecontrol.io/packages/TypeScript
