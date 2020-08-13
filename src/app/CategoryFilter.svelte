<script lang="ts">
	import { category } from "./stores";
</script>

<input type="radio" name="category" id="cat_all" bind:group={$category} value=""><label class="left" for="cat_all">All</label><!--
--><input type="radio" name="category" id="cat_compo" bind:group={$category} value="compo"><label for="cat_compo">Compo</label><!--
--><input type="radio" name="category" id="cat_jam" bind:group={$category} value="jam"><label class="right" for="cat_jam">Jam</label>

<style>
	input[type=radio] {
		display: none;
	}
	label {
		display: inline-block;
		box-sizing: border-box;
		font-size: 14px;
		padding: 5px 12px 1px 12px;
		cursor: pointer;
		border-bottom-color: var(--compoColor);
		border-style: solid;
		border-width: 0 0 4px 0;
		background-color: white;
		min-width: 70px;
		line-height: 17px;
		margin-right: 1px;
	}
	label.left {
		border-top-left-radius: 4px;
		border-bottom-left-radius: 4px;
		border-bottom-color: var(--brandColor);
	}
	label.right {
		border-top-right-radius: 4px;
		border-bottom-right-radius: 4px;
		border-bottom-color: var(--jamColor);
	}
	input:checked+label {
		background-color: var(--compoColor);
		border-color: var(--compoColor);
		color: white;
	}
	input:checked+label.left {
		background-color: var(--brandColor);
		border-color: var(--brandColor);
		color: white;
	}
	input:checked+label.right {
		background-color: var(--jamColor);
		border-color: var(--jamColor);
		color: white;
	}
</style>
