Ludum Dare Games Browser
========================

Try it here: http://zenmumbler.net/dtbb

This is a website concept that allows you to quickly and efficiently find games to
play entered into the Ludum Dare competition (the current one #35 only for now) in ways
that are impossible by browsing on the main LD site.

You can:

* Search for any number of terms on a __full-text index__ over all text in a submission.
* Filter by download types such as Mac, Win, Linux, HTML5, Unity, etc.
* Filter by category (all, compo, jam)
* Directly link (in a new tab) to any game that you want to play (links to the LD entry page)

And all the filtering is __instant__ so you can just try out some search terms and see what
happens.

It is implemented as a simple web application with no server component.<br>
Technical features are a dynamic grid that allows you to quickly and smoothly scroll in any
browser through the thousands of entries, resize the window to show between 2 and 6
columns per row and a client-side basic full-text filtering engine with ngrams between
2 and 12 characters in length.

Disclaimer
----------

The data in this site was scraped from the main Ludum Dare website Friday, April 22nd 2016.
Any changes made by contestants after this date will not show up unless I re-scrape.

The categorising of entries is based on their download links and titles. I tried to be
reasonably smart but there may be false positives.

The site links directly to the thumbnail images on the ludumdare.com website, if this turns
out to be a problem, I can capture them and store them on S3 or something.

Neither this project nor I are not affiliated with or endorsed by Ludum Dare staff. I do
not own or claim to own the data extracted from the LD site. In fact, if you want to make
something cool yourself, use the ld35-entries.json file in the data dir and have a go.
This project was mainly started to address my own frustration with using the aging LD interface.

Now go and play + rate some games.
