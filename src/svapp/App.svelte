<script lang="ts">
	import Controls from "./Controls.svelte";
	import LoadingWall from "./LoadingWall.svelte";
	import { loading, loadingRatio } from "./catalogstore";
	import GamesGrid from "./GamesGrid.svelte";

</script>

<div id="dtbb" class="no-select">
	<Controls />
	<GamesGrid />
	{#if $loading}
		<LoadingWall ratio={$loadingRatio} />
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
