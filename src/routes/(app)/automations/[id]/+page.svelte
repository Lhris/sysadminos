<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ChevronDown } from '@lucide/svelte';
	import { PROFILE_TOKENS, type AutomationField } from '$lib/automation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state(data.automation.name);
	let url = $state(data.automation.url);
	let description = $state(data.automation.description ?? '');
	let fields = $state<AutomationField[]>(data.fields.map((f) => ({ ...f })));
	let confirmDelete = $state(false);

	const fieldsJson = $derived(JSON.stringify(fields));

	// Token dropdown options, e.g. "{{microsoftEmail}}".
	const tokenOptions = PROFILE_TOKENS.map((t) => `{{${t}}}`);

	// camelCase token → "Title Case" label, e.g. microsoftEmail → "Microsoft Email".
	function humanize(token: string) {
		return token
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/^./, (c) => c.toUpperCase());
	}

	function addField() {
		fields = [...fields, { key: '', label: '', default: '' }];
	}
	function removeField(i: number) {
		fields = fields.filter((_, idx) => idx !== i);
	}

	// When the Token value is exactly a single {{token}}, autofill empty Key/Label.
	function onTokenInput(field: AutomationField) {
		const match = field.default.trim().match(/^\{\{\s*(\w+)\s*\}\}$/);
		if (!match) return;
		const token = match[1];
		if (!field.key.trim()) field.key = token;
		if (!field.label.trim()) field.label = humanize(token);
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/automations" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Automations
	</a>

	<form
		method="POST"
		action="?/update"
		use:enhance={() => async ({ update }) => { await update({ reset: false }); }}
		class="flex flex-col gap-6"
	>
		<input type="hidden" name="fields" value={fieldsJson} />

		<header class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-[24px] leading-none tracking-[-0.03em]">{name || 'Untitled automation'}</h1>
				<p class="mt-1 text-[13px] text-muted-foreground">Configure the webhook and the payload fields.</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Button type="button" variant="outline" size="sm" class="text-destructive hover:text-destructive" onclick={() => (confirmDelete = true)}>Delete</Button>
				<Button type="submit" size="sm">Save</Button>
			</div>
		</header>

		{#if form?.success}<p class="text-[12px] text-green-600">Saved.</p>{/if}
		{#if form?.updateError}<p class="text-[12px] text-destructive">{form.updateError}</p>{/if}

		<Card.Root>
			<Card.Content class="space-y-4 p-6">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Name</Label>
					<Input name="name" bind:value={name} />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Webhook URL</Label>
					<Input name="url" bind:value={url} placeholder="https://prod-XX.westus.logic.azure.com/..." />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Description <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="description" bind:value={description} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0 px-6 py-4">
				<div>
					<Card.Title class="text-[15px]">Payload fields</Card.Title>
					<Card.Description class="text-[12px]">Each row becomes a JSON property sent to the webhook. Defaults can use tokens like <code>{'{{firstName}}'}</code>, resolved from the employee when run.</Card.Description>
				</div>
				<Button type="button" variant="outline" size="sm" onclick={addField}>+ Add field</Button>
			</Card.Header>
			<Card.Content class="px-6 pb-6">
				{#if fields.length === 0}
					<p class="py-4 text-center text-[13px] text-muted-foreground">No fields yet. The whole payload will be empty.</p>
				{:else}
					<div class="space-y-3">
						<div class="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
							<span>Token</span><span>Key</span><span>Label</span><span></span>
						</div>
						{#each fields as field, i (i)}
							<div class="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3">
								<div class="relative">
									<Input bind:value={field.default} oninput={() => onTokenInput(field)} placeholder={'{{microsoftEmail}}'} class="pr-8 font-mono text-[12px]" />
									<DropdownMenu.Root>
										<DropdownMenu.Trigger class="absolute right-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
											<ChevronDown class="h-3.5 w-3.5" />
										</DropdownMenu.Trigger>
										<DropdownMenu.Content class="max-h-64 overflow-y-auto">
											{#each tokenOptions as opt (opt)}
												<DropdownMenu.Item class="font-mono text-[12px]" onclick={() => { field.default = opt; onTokenInput(field); }}>{opt}</DropdownMenu.Item>
											{/each}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</div>
								<Input bind:value={field.key} placeholder="companyEmail" class="font-mono text-[12px]" />
								<Input bind:value={field.label} placeholder="Company Email" />
								<button type="button" onclick={() => removeField(i)} class="px-1 text-[13px] text-muted-foreground hover:text-destructive">✕</button>
							</div>
						{/each}
					</div>
				{/if}
				<p class="mt-4 text-[11.5px] text-muted-foreground">
					Available tokens: {#each PROFILE_TOKENS as t, i (t)}<code class="text-foreground/70">{'{{' + t + '}}'}</code>{#if i < PROFILE_TOKENS.length - 1}{', '}{/if}{/each}
				</p>
			</Card.Content>
		</Card.Root>
	</form>

</main>

<AlertDialog.Root bind:open={confirmDelete}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay />
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete this automation?</AlertDialog.Title>
				<AlertDialog.Description>
					It will be detached from any checklist tasks that use it. This can't be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel onclick={() => (confirmDelete = false)}>Cancel</AlertDialog.Cancel>
				<form method="POST" action="?/delete" use:enhance>
					<AlertDialog.Action type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialog.Action>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
