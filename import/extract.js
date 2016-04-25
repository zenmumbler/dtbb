// extract.js

function entryDoc(uid) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.responseType = "document";
		xhr.open("GET", "entry_pages/entry_" + uid + ".html");
		xhr.onload = function() {
			resolve(xhr.response);
		};
		xhr.onerror = reject;
		xhr.send(null);
	});
}

function loadCatalog() {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.responseType = "json";
		xhr.open("GET", "catalog.json");
		xhr.onload = function() {
			resolve(xhr.response);
		};
		xhr.onerror = reject;
		xhr.send(null);
	});
}

function createEntry(url, uid, thumbImg, doc) {
	const ldBaseURL = "http://ludumdare.com/compo/";
	const eventBaseURL = ldBaseURL + "ludum-dare-35/";

	var base = doc.querySelector("#compo2");
	if (! base) {
		console.error("no base for uid", uid);
		return null;
	}
	var titleElem = base.querySelector("h2");
	var avatarImg = base.querySelector("img.avatar");
	var authorLink = titleElem.parentElement.querySelector("a");
	var categoryElem = titleElem.parentElement.querySelector("i");
	var authorName = authorLink.querySelector("strong").textContent;
	var screensArrayElem = base.querySelector(".shot-nav");
	var screensArray = [].slice.call(screensArrayElem.querySelectorAll("img"), 0);
	var linksArray = [].slice.call(base.querySelectorAll(".links a"), 0);
	var description = screensArrayElem.nextSibling.textContent;

	return {
		title: titleElem.textContent,
		category: categoryElem.textContent.split(" ")[0].toLowerCase(),
		description: description,

		thumbnail_url: thumbImg,
		entry_url: eventBaseURL + url,

		author: {
			name: authorName,
			uid: uid,
			avatar_url: avatarImg.src,
			author_home_url: ldBaseURL + authorLink.getAttribute("href").substr(3)
		},

		screens: screensArray.map((screen) => {
			var imgoc = screen.getAttribute("onclick");
			return imgoc && {
				thumbnail_url: screen.src.replace(/compo2\/\//g, "compo2/"),
				full_url: imgoc && imgoc.substring(imgoc.lastIndexOf("http://"), imgoc.indexOf('")'))
			};
		}).filter(s => !!s),
		links: linksArray.map((link) => {
			return {
				title: link.textContent,
				url: link.getAttribute("href")
			};
		})
	};
}


window.addEventListener("load", () => {
	var entries = new Map();
	var allP = [];

	loadCatalog().then((catalog) => {
		var count = catalog.links.length;

		catalog.links.forEach((link, ix) => {
			var thumb = catalog.thumbs[ix];
			var uid = parseInt(link.substr(link.indexOf("uid=") + 4));

			var p = entryDoc(uid).then(
				(doc) => {
					var entry = createEntry(link, uid, thumb, doc);
					if (entry) {
						entries.set(uid, entry);
					}
				}
			);//.catch((err) => { console.info("ERROR ", uid); });
			allP.push(p);
		});
		console.info("all filed", allP);

		Promise.all(allP).then(() => {
			console.info("all done");
			var entryArray = [];
			for (var kv of entries) {
				entryArray.push(kv[1]);
			}

			document.querySelector("#output").textContent = JSON.stringify(entryArray);
		});
	});
});
