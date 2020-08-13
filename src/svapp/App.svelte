<script lang="ts">
	import { category, platform, query, issue } from "./stores";
	import Controls from "./Controls.svelte";
	import LoadingWall from "./LoadingWall.svelte";
	import { filteredSet, loading, loadingRatio } from "./catalogstore";

</script>

<div id="dtbb" class="no-select">
	<Controls />
	{#if $loading}
		<LoadingWall ratio={$loadingRatio} />
	{/if}

	<p>The current category is { $category }</p>
	<p>The current platform is { $platform }</p>
	<p>The current query is { $query }</p>
	<p>The current issue is { $issue }</p>

	<p>The current number of items filtered is { $filteredSet.size }</p>
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
