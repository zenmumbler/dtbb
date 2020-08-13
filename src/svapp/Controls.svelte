<script lang="ts">
	import type { IssueInfo } from "../lib/catalog";
	import { Platforms, IssueData } from "../lib/catalog";
	import { platform, issue, query } from "./stores";
	import CategoryFilter from "./CategoryFilter.svelte";

	const platforms = Array.from(Object.values(Platforms));
	
	function groupByYear(a: IssueInfo[]) {
		const years = new Map<number, IssueInfo[]>();
		for (const issue of a) {
			if (! years.has(issue.year)) {
				years.set(issue.year, [issue]);
			}
			else {
				years.get(issue.year)!.push(issue);
			}
		}
		// reverse year sort with issues per year also sorted in reverse
		return Array.from(years.entries())
			.map(e => (e[1].sort((a, b) => b.issue - a.issue), e))
			.sort((a, b) => b[0] - a[0]);
	}

	const issues = groupByYear(Array.from(Object.values(IssueData)));
</script>

<div id="controls">
	<div class="filters">
		<CategoryFilter />

		<!-- svelte-ignore a11y-autofocus -->
		<input type="text" bind:value={$query} id="terms" autofocus autocomplete="off" placeholder="Search Terms (2 char minimum)">

		<select bind:value={$platform} class="platform">
			<option value={0}>All Platforms</option>
			{#each platforms as { mask, label }}
				<option value={mask}>{label}</option>
			{/each}
		</select>

		<select bind:value={$issue} class="issue">
			{#each issues as pair}
			<optgroup label={""+pair[0]}>
				{#each pair[1] as issin}
					<option value={issin.issue}>LD {issin.issue} - {issin.theme}</option>	
				{/each}
			</optgroup>
			{/each}
		</select>

	</div>
</div>

<style>
	#controls {
		position: relative;
		padding: 20px 12px;
		background: linear-gradient(to bottom, #18181c 0%, #171a22 100%);
		border-bottom: 1px solid #333;
		cursor: default;
	}

	.filters {
		line-height: 18px;
		text-align: center;
	}

	/* query */
	input[type=text] {
		margin: 0 16px;
		width: 220px;
		font-size: 15px;
		padding: 4px 8px;
		border: 1px solid rgb(182,182,182);
		line-height: 18px;
		border-radius: 3px;
	}

	/* issue and platform selects */
	select {
		font-size: 14px;
		margin: 0;
		min-width: 140px;
		border-color: white;
	}
	select.platform {
		margin-right: 16px;
		width: 140px;
	}
	select.issue {
		width: 220px;
	}

	/* wider controls */
	@media (min-width:1272px) {
		input[type=text] {
			width: 280px;
		}
		select.platform {
			width: 200px;
		}
		select.issue {
			width: 280px;
		}
	}
</style>
