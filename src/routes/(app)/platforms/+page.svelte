<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let sheetOpen = $state(false);

	const totalActive = $derived(data.platforms.reduce((n, p) => n + p.activeCount, 0));
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Platforms</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.platforms.length} platform{data.platforms.length === 1 ? '' : 's'} · {totalActive} active license{totalActive === 1 ? '' : 's'}
			</p>
		</div>
		<Button size="sm" onclick={() => (sheetOpen = true)}>Add Platform</Button>
	</header>

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.platforms.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◧</span>
					<p class="text-[14px] font-medium text-foreground">No platforms yet</p>
					<p class="text-[13px] text-muted-foreground">Add a platform like “ActivTrak”, then bulk-import its licenses.</p>
					<Button size="sm" class="mt-1" onclick={() => (sheetOpen = true)}>Add Platform</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Platform</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Description</Table.Head>
							<Table.Head class="px-3 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Active</Table.Head>
							<Table.Head class="px-3 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Removed</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Unlinked</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.platforms as p (p.id)}
							<Table.Row class="group">
								<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] font-medium text-foreground">{p.name}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">{p.description ?? '—'}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-right text-[13.5px] font-medium tabular-nums text-foreground">{p.activeCount}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-right text-[13.5px] tabular-nums {p.removedCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40'}">{p.removedCount}</Table.Cell>
								<Table.Cell class="px-3 py-3">
									{#if p.unlinkedCount > 0}
										<Badge variant="outline" class="border-amber-300 text-[11px] text-amber-700">{p.unlinkedCount} unlinked</Badge>
									{:else}
										<span class="text-[12px] text-muted-foreground">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="py-3 pl-3 pr-5 text-right">
									<a href="/platforms/{p.id}" class="text-[12px] font-medium text-muted-foreground no-underline opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
										View →
									</a>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

</main>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-md">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">Add Platform</Sheet.Title>
			<Sheet.Description class="text-xs">A service you assign licenses for, e.g. ActivTrak.</Sheet.Description>
		</Sheet.Header>

		<form
			method="POST"
			action="?/addPlatform"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: true });
				if (result.type === 'success') sheetOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Name</Label>
					<Input name="name" placeholder="ActivTrak" class={form?.addError ? 'border-destructive' : ''} />
					{#if form?.addError}<p class="text-[12px] text-destructive">{form.addError}</p>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Description <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="description" placeholder="Employee monitoring" />
				</div>
			</div>

			<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Add Platform</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
