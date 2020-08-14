<script lang="ts">
	import { fade } from "svelte/transition";

	export let message = "Loading…";
	export let ratio: number;

	$: barWidth = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
</script>

<div id="smokedglass" out:fade="{{ duration: 400 }}">
	<div class="status">
		<p>{ message }</p>
		<div class="bar"><div class="progress" style="width: {barWidth}"></div></div>
	</div>
</div>

<style>
#smokedglass {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.4);
	z-index: 1;
	transition: background-color 0.5s ease-out;
}

.status {
	box-sizing: border-box;
	position: absolute;
	width: 400px;
	padding: 20px;
	top: 30vh;
	left: 50vw;
	margin-left: -220px;
	background: linear-gradient(to bottom, #202022 0%, #171a22 100%);
	border-right: 12px solid var(--brandColor);
	color: white;
	transition: opacity 0.5s ease-out;
	box-shadow: 4px 4px 4px 2px rgba(0, 0, 0, 0.4);
}

.bar {
	position: relative;
	width: 348px;
	height: 8px;
	background-color: #888;
}
.progress {
	position: absolute;
	left: 0;
	top: 0;
	background-color: var(--compoColor);
	height: 8px;
	width: 0;
}
</style>
