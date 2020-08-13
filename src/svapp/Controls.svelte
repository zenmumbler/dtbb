<script lang="ts">
	import { Platforms } from "../lib/catalog";
	import { platform, issue, query } from "./stores";
	import CategoryFilter from "./CategoryFilter.svelte";

	const platforms = Array.from(Object.values(Platforms));
</script>

<div id="controls">
	<div class="filters">
		<CategoryFilter />

		<input type="text" bind:value={$query} id="terms" autofocus autocomplete="off" placeholder="Search Terms (2 char minimum)">

		<select bind:value={$platform} data-filter="platform">
			<option value="0">All Platforms</option>
			{#each platforms as { mask, label }}
				<option value={mask}>{label}</option>
			{/each}
		</select>

		<select bind:value={$issue} data-filter="issue">
			<optgroup label="2020">
				<option value="46">LD 46 - Keep it alive</option>
			</optgroup>
			<optgroup label="2019">
				<option value="45">LD 45 - Start with nothing</option>
				<option value="44">LD 44 - Your life is currency</option>
			</optgroup>
			<optgroup label="2018">
				<option value="43">LD 43 - Sacrifices must be made</option>
				<option value="42">LD 42 - Running out of Space</option>
				<option value="41">LD 41 - Two Incompatible Genres</option>
			</optgroup>
			<optgroup label="2017">
				<option value="40">LD 40 - The more you have, the worse it is</option>
				<option value="39">LD 39 - Running out of Power</option>
				<option value="38">LD 38 - A Small World</option>
			</optgroup>
			<optgroup label="2016">
				<option value="37">LD 37 - One Room</option>
				<option value="36">LD 36 - Ancient Technology</option>
				<option value="35">LD 35 - Shapeshift</option>
			</optgroup>
			<optgroup label="2015">
				<option value="34">LD 34 - Two Button Controls, Growing</option>
				<option value="33">LD 33 - You are the Monster</option>
				<option value="32">LD 32 - An Unconventional Weapon</option>
			</optgroup>
			<optgroup label="2014">
				<option value="31">LD 31 - Entire Game on One Screen</option>
				<option value="30">LD 30 - Connected Worlds</option>
				<option value="29">LD 29 - Beneath the Surface</option>
			</optgroup>
			<optgroup label="2013">
				<option value="28">LD 28 - You Only Get One</option>
				<option value="27">LD 27 - 10 Seconds</option>
				<option value="26">LD 26 - Minimalism</option>
			</optgroup>
			<optgroup label="2012">
				<option value="25">LD 25 - You are the Villain</option>
				<option value="24">LD 24 - Evolution</option>
				<option value="23">LD 23 - Tiny World</option>
			</optgroup>
			<optgroup label="2011">
				<option value="22">LD 22 - Alone</option>
				<option value="21">LD 21 - Escape</option>
				<option value="20">LD 20 - It’s Dangerous to go Alone! Take this!</option>
			</optgroup>
			<optgroup label="2010">
				<option value="19">LD 19 - Discovery</option>
				<option value="18">LD 18 - Enemies as Weapons</option>
				<option value="17">LD 17 - Islands</option>
			</optgroup>
			<optgroup label="2009">
				<option value="16">LD 16 - Exploration</option>
				<option value="15">LD 15 - Caverns</option>
			</optgroup>
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
	select[data-filter=platform] {
		margin-right: 16px;
		width: 140px;
	}
	select[data-filter=issue] {
		width: 220px;
	}

	/* wider controls */
	@media (min-width:1272px) {
		input[type=text] {
			width: 280px;
		}
		select[data-filter=platform] {
			width: 200px;
		}
		select[data-filter=issue] {
			width: 280px;
		}
	}
</style>
