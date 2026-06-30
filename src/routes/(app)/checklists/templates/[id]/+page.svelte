<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import TemplateTable from './TemplateTable.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let jsonMode = $state(false);

	const itemsToJson = () => JSON.stringify(
		data.items.map(({ id, type, label, videoUrl, docUrl }) => ({
			id,
			type,
			label,
			...(videoUrl ? { videoUrl } : {}),
			...(docUrl   ? { docUrl }   : {})
		})),
		null, 2
	);

	let jsonValue = $state('');

	$effect(() => {
		if (jsonMode) jsonValue = itemsToJson();
	});
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a class="text-[13px] font-medium text-muted-foreground" href={resolve('/checklists')}>
		← Back to Checklists
	</a>

	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-[26px] font-semibold">{data.template.name}</h1>
			<p class="text-[13px] text-muted-foreground">{data.template.description ?? ''}</p>
		</div>
		<button
			type="button"
			onclick={() => (jsonMode = !jsonMode)}
			class="rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors
				{jsonMode ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
		>
			{jsonMode ? '← Visual' : 'JSON'}
		</button>
	</div>

	{#if jsonMode}
		<div class="flex flex-col gap-3">
			{#if form?.jsonError}
				<p class="text-[12px] text-destructive">Error: {form.jsonError}</p>
			{/if}
			<form method="POST" action="?/saveJson" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') jsonMode = false;
			}}>
				<textarea
					name="json"
					bind:value={jsonValue}
					spellcheck="false"
					class="w-full rounded-lg border border-border bg-white font-mono text-[13px] leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring p-4 resize-none"
					rows={Math.max(16, jsonValue.split('\n').length + 2)}
				></textarea>
				<div class="mt-3 flex items-center gap-3">
					<button type="submit" class="rounded-md bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-80">
						Save
					</button>
					<button type="button" onclick={() => (jsonMode = false)} class="text-[13px] text-muted-foreground hover:text-foreground">
						Cancel
					</button>
					<p class="ml-auto text-[12px] text-muted-foreground">
						Saving replaces all items. Supported keys: <code class="font-mono">type</code>, <code class="font-mono">label</code>, <code class="font-mono">videoUrl</code>
					</p>
				</div>
			</form>
		</div>
	{:else}
		<TemplateTable assignments={data.assignments} items={data.items} completions={data.completions} automations={data.automations} />
	{/if}

</main>
