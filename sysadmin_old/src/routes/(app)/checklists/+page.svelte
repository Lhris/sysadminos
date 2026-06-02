<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Checklists</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				Onboarding and offboarding task templates
			</p>
		</div>
		<Button size="sm">New Checklist</Button>
	</header>

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.checklists.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">☐</span>
					<p class="text-[14px] font-medium text-foreground">No checklists yet</p>
					<p class="text-[13px] text-muted-foreground">
						Create a checklist template to standardize your onboarding and offboarding workflows.
					</p>
					<Button variant="outline" size="sm" class="mt-1">New Checklist</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

</main>
