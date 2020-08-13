<script lang="ts">
	import Controls from "./Controls.svelte";
	import LoadingWall from "./LoadingWall.svelte";
	import { loading, loadingRatio, nukeAndPave } from "./catalogstore";
	import GamesGrid from "./GamesGrid.svelte";

	let message = "Loading…";

	// this function is a hacky way to allow anyone to completely get rid of the local database
	// - which can become rather large - pending a UI to do this.
	export function reset() {
		console.info("Deleting local data, please wait, this can take a while...");
		message = "Deleting local data…";

		loadingRatio.set(1);
		loading.set(true);

		nukeAndPave().then(
			() => {
				console.info("Local database deleted, when you reload the page a new database will be created.");
				message = "Local data cleared";
			},
			(err) => {
				console.warn("Could not delete local database. Error:", err);
				message = "Failed to delete data";
			}
		);
	}

	console.info("Hi! If you ever need to delete all local data cached by DTBB just run: `dtbb.reset()` in your console while on this page. Have fun!");
</script>

<div id="dtbb" class="no-select">
	<Controls />
	<GamesGrid />
	{#if $loading}
		<LoadingWall message={message} ratio={$loadingRatio} />
	{/if}
</div>

<style>
#dtbb {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	min-width: 960px;
	background-color: white;
}
</style>
