<script lang="ts">
	import type { IndexedEntry } from "../lib/catalog";
	import { mediaThumbURL, Platforms } from "../lib/catalog";

	export let entry: IndexedEntry;
	export let posX: number;
	export let posY: number;
</script>

<div
	class="entry"
	data-doc-id={entry.docID}
	style="left: {posX}px; top: {posY}px"
><a
	href={entry.entry_url}
	class:compo={entry.category==="compo"}
	class:jam={entry.category==="jam"}
	target="_blank"
>
	<div class="thumb" style="background-image: url({ mediaThumbURL(entry.ld_issue, entry.thumbnail_url) })"></div>
	<h2 class="no-text-wrap">{ entry.title }</h2>
	<p class="author no-text-wrap">by <span>{ entry.author.name }</span></p>
	<p class="pills no-text-wrap">
		{#each entry.platforms as plat}
			<span class="pill">{ Platforms[plat].label }</span>
		{/each}
	</p>
</a></div>

<style>
	.entry {
		position: absolute;
		box-sizing: border-box;
		width: 392px;
		height: 122px;
		cursor: pointer;
		background-color: white;
	}

	a {
		display: block;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 16px;
		margin: 0;
		color: currentColor;
		text-decoration: none;
	}
	a.compo {
		border-right: 8px solid var(--compoColor);
	}
	a.jam {
		border-right: 8px solid var(--jamColor);
	}

	a:hover {
		border-right-width: 12px;
	}
	a:hover h2 {
		color: #383838;
	}
	a:hover .author {
		color: #686868;
	}
	
	.thumb {
		width: 122px;
		height: 122px;
		float: left;
		margin-right: 0;
		position: relative;
		left: -16px;
		top: -16px;
		background-position: center center;
		background-size: cover;
	}

	h2 {
		font-size: 17px;
		margin: 0 0 .2em 0;
		max-width: 275px;
		color: #585858;
	}
	.author {
		font-size: 12px;
		margin: 0 0 .8em 0;
		color: #888;
	}

	.pills {
		max-width: 248px;
		position: absolute;
		bottom: 16px;
		left: 136px;
		margin: 0;
		padding: 0;
	}
	.pill {
		display: inline-block;
		font-size: 11px; padding: 2px 4px;
		background-color: #eee;
		border-radius: 3px;
		margin-right: 2px;
		color: #777;
	}
</style>
