<script lang="ts">
	import { arrayFromSet } from "../lib/setutil";
	import { filteredSet, entries } from "./catalogstore";
	import GameCell from "./GameCell.svelte";

	const gridOffsetX = 20;
	const gridOffsetY = 20;

	const cellWidth = 392;
	const cellHeight = 122;
	const cellMargin = 24;
	const overflowRows = 6;

	let viewWidth = 0;
	let viewHeight = 0;
	let scrollPos = 0;

	$: cols = Math.floor(viewWidth / (cellWidth + cellMargin));
	$: rows = Math.ceil(viewHeight / (cellHeight + cellMargin)) + overflowRows;
	$: cellCount = cols * rows;

	$: virtualRows = Math.ceil($filteredSet.size / cols);
	$: virtualHeight = (gridOffsetY * 2) + virtualRows * (cellHeight + cellMargin);
	$: firstViewRow = Math.floor(scrollPos / (cellHeight + cellMargin));
	$: firstViewPos = firstViewRow * cols;

	$: filteredEntries = arrayFromSet($filteredSet);
	$: filteredCells = filteredEntries.slice(firstViewPos, firstViewPos + cellCount).map((id, index) => {
		const cellPos = firstViewPos + index;
		const cellRow = Math.floor(cellPos / cols);
		const cellCol = cellPos % cols;

		return {
			entry: $entries.get(id)!,
			posX: gridOffsetX + (cellCol * (cellWidth + cellMargin)),
			posY: gridOffsetY + (cellRow * (cellHeight + cellMargin))
		};
	});
</script>

<div id="entriesholder"
	bind:offsetWidth={viewWidth}
	bind:offsetHeight={viewHeight}
	on:scroll={evt => scrollPos = Math.max(0, evt.target.scrollTop - gridOffsetY)}
>
	<div class="entries"
		style="height: {virtualHeight}px"
	>
		{#each filteredCells as entry}
			<GameCell { ...entry } />
		{/each}
	</div>
</div>

<style>
#entriesholder {
	position: absolute;
	top: 68px;
	left: 0;
	right: 0;
	bottom: 0;
	overflow-x: hidden;
	overflow-y: scroll;
	-webkit-overflow-scrolling: touch;
	background-color: #373d44;
}

/* 2 to 6 columns with padding centered for that responsive vibe */
.entries {
	padding: 20px 4px 20px 20px;
	width: 832px;
	margin: 0 auto;
	position: relative;
}
@media (min-width:1272px) {
	.entries { width: 1248px; }
}
@media (min-width:1688px) {
	.entries { width: 1664px; }
}
@media (min-width:2104px) {
	.entries { width: 2080px; }
}
@media (min-width:2520px) {
	.entries { width: 2496px; }
}
</style>
