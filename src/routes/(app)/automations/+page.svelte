<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let sheetOpen = $state(false);

	function rowClick(e: MouseEvent, id: string) {
		if ((e.target as HTMLElement).closest('input,button,a,[role="menu"]')) return;
		goto(`/automations/${id}`);
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Automations</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.automations.length} automation{data.automations.length === 1 ? '' : 's'} · webhooks you can run from a checklist
			</p>
		</div>
		<Button size="sm" onclick={() => (sheetOpen = true)}>Add Automation</Button>
	</header>

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.automations.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">⚡</span>
					<p class="text-[14px] font-medium text-foreground">No automations yet</p>
					<p class="text-[13px] text-muted-foreground">Add a webhook like a Power Automate flow, then attach it to a checklist task.</p>
					<Button size="sm" class="mt-1" onclick={() => (sheetOpen = true)}>Add Automation</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">URL</Table.Head>
							<Table.Head class="px-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Fields</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.automations as a (a.id)}
							<Table.Row onclick={(e) => rowClick(e, a.id)} class="group cursor-pointer">
								<Table.Cell class="py-3 pl-5 pr-3">
									<a href="/automations/{a.id}" class="text-[13.5px] font-medium text-foreground no-underline hover:underline">{a.name}</a>
									{#if a.description}<p class="mt-0.5 text-[12px] text-muted-foreground">{a.description}</p>{/if}
								</Table.Cell>
								<Table.Cell class="max-w-[360px] truncate px-3 py-3 font-mono text-[12px] text-muted-foreground">{a.url}</Table.Cell>
								<Table.Cell class="px-3 py-3 pr-5 text-right text-[13.5px] tabular-nums text-foreground">{a.fieldCount}</Table.Cell>
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
			<Sheet.Title class="text-base">Add Automation</Sheet.Title>
			<Sheet.Description class="text-xs">An HTTP webhook, e.g. a Power Automate trigger URL. Configure fields after creating.</Sheet.Description>
		</Sheet.Header>

		<form
			method="POST"
			action="?/addAutomation"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: true });
				if (result.type === 'success') sheetOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Name</Label>
					<Input name="name" placeholder="Welcome / Credentials Email" class={form?.addError ? 'border-destructive' : ''} />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Webhook URL</Label>
					<Input name="url" placeholder="https://prod-XX.westus.logic.azure.com/..." class={form?.addError ? 'border-destructive' : ''} />
					{#if form?.addError}<p class="text-[12px] text-destructive">{form.addError}</p>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Description <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="description" placeholder="Sends Microsoft account credentials to a new hire" />
				</div>
			</div>

			<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Add Automation</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
