<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import TemplateTable from './TemplateTable.svelte';

	let { data }: { data: PageData } = $props();
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a class="text-[13px] font-medium text-muted-foreground" href={resolve('/checklists')}>
		← Back to Checklists
	</a>

	<div>
		<h1 class="text-[26px] font-semibold">{data.template.name}</h1>
		<p class="text-[13px] text-muted-foreground">{data.template.description ?? ''}</p>
	</div>

	<TemplateTable assignments={data.assignments} items={data.items} completions={data.completions} />

</main>
