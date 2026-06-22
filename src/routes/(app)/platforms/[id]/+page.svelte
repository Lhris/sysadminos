<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const plat = $derived(data.platform);

	let importOpen = $state(false);
	let editOpen = $state(false);
	let addOpen = $state(false);

	const selectClass =
		'flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

	const exampleJson = `[
  { "name": "Jane Doe", "email": "jane@acme.com" },
  { "name": "John Roe", "email": "john@acme.com" }
]`;

	const active = $derived(data.licenses.filter((l) => !l.removedAt));
	const removed = $derived(data.licenses.filter((l) => l.removedAt));
	const unlinked = $derived(active.filter((l) => !l.employeeId));
	const pending = $derived(active.filter((l) => l.pendingTermination));
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/platforms" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Platforms
	</a>

	<header class="flex items-start justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-[24px] leading-none tracking-[-0.03em]">{plat.name}</h1>
				<Badge variant="secondary" class="text-[11px]">{data.licenses.length} license{data.licenses.length === 1 ? '' : 's'}</Badge>
				{#if unlinked.length > 0}
					<Badge variant="outline" class="border-amber-300 text-[11px] text-amber-700">{unlinked.length} unlinked</Badge>
				{/if}
			</div>
			{#if plat.description}<p class="mt-1.5 text-[13px] text-muted-foreground">{plat.description}</p>{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (editOpen = true)}>Edit</Button>
			<Button variant="outline" size="sm" onclick={() => (addOpen = true)}>Add license</Button>
			<Button size="sm" onclick={() => (importOpen = true)}>Bulk import</Button>
		</div>
	</header>

	{#if form?.importResult}
		<div class="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">
			Imported {form.importResult.imported} license{form.importResult.imported === 1 ? '' : 's'} —
			<strong>{form.importResult.linked}</strong> linked to employees,
			<strong>{form.importResult.unlinked}</strong> unlinked.
		</div>
	{/if}

	{#if form?.syncResult}
		<div class="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">
			{#if form.syncResult.matched > 0}
				Linked <strong>{form.syncResult.matched}</strong> of {form.syncResult.total} unlinked license{form.syncResult.total === 1 ? '' : 's'} by matching email or name.
			{:else}
				No matching employees found for the {form.syncResult.total} unlinked license{form.syncResult.total === 1 ? '' : 's'}.
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Pending termination -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0 border-b px-5 py-3.5">
				<div class="flex items-center gap-2">
					<span class="text-[14px] font-medium text-foreground">Pending termination</span>
					<Badge variant="secondary" class="text-[11px] tabular-nums">{pending.length}</Badge>
				</div>
			</Card.Header>
			<Card.Content class="p-0">
				{#if pending.length === 0}
					<p class="px-5 py-8 text-center text-[13px] text-muted-foreground">No assignees are being terminated.</p>
				{:else}
					<ul class="divide-y">
						{#each pending as l (l.id)}
							<li class="flex items-center justify-between gap-3 px-5 py-3">
								<div class="min-w-0">
									<p class="truncate text-[13.5px] font-medium text-foreground">{l.empFirstName} {l.empLastName}</p>
									<p class="truncate text-[12px] text-muted-foreground">{l.matchEmail ?? l.displayName ?? '—'}</p>
								</div>
								<form method="POST" action="?/toggleRemoved" use:enhance>
									<input type="hidden" name="licenseId" value={l.id} />
									<input type="hidden" name="removing" value="true" />
									<Button type="submit" variant="outline" size="sm" class="h-7 shrink-0 px-2.5 text-[12px]">Mark removed</Button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Needs linking -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0 border-b px-5 py-3.5">
				<div class="flex items-center gap-2">
					<span class="text-[14px] font-medium text-foreground">Needs linking</span>
					<Badge variant="secondary" class="text-[11px] tabular-nums">{unlinked.length}</Badge>
				</div>
				{#if unlinked.length > 0}
					<form method="POST" action="?/syncUnlinked" use:enhance>
						<Button type="submit" variant="outline" size="sm" class="h-7 px-2.5 text-[12px]">Sync</Button>
					</form>
				{/if}
			</Card.Header>
			<Card.Content class="p-0">
				{#if unlinked.length === 0}
					<p class="px-5 py-8 text-center text-[13px] text-muted-foreground">Every active license is linked.</p>
				{:else}
					<ul class="divide-y">
						{#each unlinked as l (l.id)}
							<li class="flex items-center justify-between gap-3 px-5 py-3">
								<p class="min-w-0 truncate text-[13.5px] font-medium text-foreground">{l.matchEmail ?? l.displayName ?? '—'}</p>
								<form method="POST" action="?/linkLicense" use:enhance class="shrink-0">
									<input type="hidden" name="licenseId" value={l.id} />
									<select
										name="employeeId"
										value=""
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										class="{selectClass} w-44 border-amber-300 text-amber-700"
									>
										<option value="">— Link to… —</option>
										{#each data.employees as emp (emp.id)}
											<option value={emp.id}>{emp.firstName} {emp.lastName}{emp.status === 'terminated' ? ' (terminated)' : ''}</option>
										{/each}
									</select>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	{#snippet licenseRow(l: (typeof data.licenses)[number])}
		{@const isRemoved = !!l.removedAt}
		<Table.Row class="group">
			<Table.Cell class="w-10 py-2.5 pl-5 pr-0">
				<form method="POST" action="?/toggleRemoved" use:enhance>
					<input type="hidden" name="licenseId" value={l.id} />
					<input type="hidden" name="removing" value={isRemoved ? 'false' : 'true'} />
					<button
						type="submit"
						title={isRemoved ? 'Mark as active' : 'Mark as removed / terminated'}
						class="flex h-4 w-4 items-center justify-center rounded border-[1.5px] transition-colors {isRemoved ? 'border-foreground bg-foreground' : 'border-border bg-background hover:border-foreground/50'}"
					>
						{#if isRemoved}
							<svg class="h-2.5 w-2.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
						{/if}
					</button>
				</form>
			</Table.Cell>
			<Table.Cell class="py-2.5 pl-2 pr-3">
				<div class="flex flex-col gap-[2px]">
					<span class="text-[13.5px] {isRemoved ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}">{l.matchEmail ?? l.displayName ?? '—'}</span>
					{#if l.matchEmail && l.displayName}
						<span class="text-[11.5px] text-muted-foreground {isRemoved ? 'line-through' : ''}">{l.displayName}</span>
					{/if}
				</div>
			</Table.Cell>
			<Table.Cell class="px-3 py-2.5">
				{#if isRemoved}
					<span class="text-[13px] text-muted-foreground">
						{l.empFirstName ? `${l.empFirstName} ${l.empLastName}` : 'Unlinked'}
					</span>
				{:else}
					<form method="POST" action="?/linkLicense" use:enhance class="flex items-center gap-2">
						<input type="hidden" name="licenseId" value={l.id} />
						<select
							name="employeeId"
							value={l.employeeId ?? ''}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							class="{selectClass} {l.employeeId ? '' : 'border-amber-300 text-amber-700'}"
						>
							<option value="">— Unlinked —</option>
							{#each data.employees as emp (emp.id)}
								<option value={emp.id}>{emp.firstName} {emp.lastName}{emp.status === 'terminated' ? ' (terminated)' : ''}</option>
							{/each}
						</select>
					</form>
				{/if}
			</Table.Cell>
			<Table.Cell class="py-2.5 pl-3 pr-5 text-right">
				<form method="POST" action="?/deleteLicense" use:enhance class="inline">
					<input type="hidden" name="licenseId" value={l.id} />
					<button type="submit" class="text-[12px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
						Delete
					</button>
				</form>
			</Table.Cell>
		</Table.Row>
	{/snippet}

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.licenses.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◔</span>
					<p class="text-[14px] font-medium text-foreground">No licenses yet</p>
					<p class="text-[13px] text-muted-foreground">Bulk-import a JSON list, or add one manually.</p>
					<Button size="sm" class="mt-1" onclick={() => (importOpen = true)}>Bulk import</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-10 pl-5 pr-0"></Table.Head>
							<Table.Head class="pl-2 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">License (email / name)</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Linked employee</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if active.length === 0}
							<Table.Row>
								<Table.Cell colspan={4} class="py-8 text-center text-[13px] text-muted-foreground">All licenses are marked removed.</Table.Cell>
							</Table.Row>
						{/if}
						{#each active as l (l.id)}
							{@render licenseRow(l)}
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if removed.length > 0}
		<div>
			<h2 class="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
				Terminated
				<span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums">{removed.length}</span>
			</h2>
			<Card.Root class="overflow-hidden bg-muted/30">
				<Card.Content class="p-0">
					<Table.Root>
						<Table.Body>
							{#each removed as l (l.id)}
								{@render licenseRow(l)}
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

</main>

<!-- Bulk import sheet -->
<Sheet.Root bind:open={importOpen}>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-lg">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">Bulk import licenses</Sheet.Title>
			<Sheet.Description class="text-xs">Paste a JSON array. Entries auto-link to employees by email, then by name.</Sheet.Description>
		</Sheet.Header>

		<form
			method="POST"
			action="?/bulkImport"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') importOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 space-y-3 overflow-y-auto px-6 py-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">JSON</Label>
					<textarea
						name="json"
						rows="12"
						spellcheck="false"
						placeholder={exampleJson}
						class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-[12.5px] leading-relaxed text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring {form?.importError ? 'border-destructive' : ''}"
					></textarea>
					{#if form?.importError}<p class="text-[12px] text-destructive">{form.importError}</p>{/if}
				</div>
				<div class="rounded-md bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground">
					<p class="mb-1 font-medium text-foreground">Accepted shapes</p>
					<p>• Array of objects with an email and/or name field (<code>email</code>, <code>userPrincipalName</code>, <code>name</code>, <code>displayName</code>…).</p>
					<p>• Array of email strings.</p>
					<p class="mt-1">Unmatched entries are still imported — just flagged as unlinked so you can assign them.</p>
				</div>
			</div>

			<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Import</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>

<!-- Add single license sheet -->
<Sheet.Root bind:open={addOpen}>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-md">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">Add license</Sheet.Title>
			<Sheet.Description class="text-xs">Add a single license to {plat.name}.</Sheet.Description>
		</Sheet.Header>

		<form
			method="POST"
			action="?/addLicense"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: true });
				if (result.type === 'success') addOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Email</Label>
					<Input name="email" type="email" placeholder="user@acme.com" class={form?.addLicenseError ? 'border-destructive' : ''} />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Name <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="displayName" placeholder="Jane Doe" />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Link to employee <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<select name="employeeId" class={selectClass}>
						<option value="">— Unlinked —</option>
						{#each data.employees as emp (emp.id)}
							<option value={emp.id}>{emp.firstName} {emp.lastName}</option>
						{/each}
					</select>
				</div>
				{#if form?.addLicenseError}<p class="text-[12px] text-destructive">{form.addLicenseError}</p>{/if}
			</div>

			<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Add</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>

<!-- Edit platform sheet -->
<Sheet.Root bind:open={editOpen}>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-md">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">Edit platform</Sheet.Title>
		</Sheet.Header>

		<form
			method="POST"
			action="?/updatePlatform"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') editOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Name</Label>
					<Input name="name" value={plat.name} class={form?.editError ? 'border-destructive' : ''} />
					{#if form?.editError}<p class="text-[12px] text-destructive">{form.editError}</p>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Description <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="description" value={plat.description ?? ''} />
				</div>

				<AlertDialog.Root>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<button {...props} type="button" class="text-[12px] font-medium text-destructive hover:underline">Delete platform</button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Delete {plat.name}?</AlertDialog.Title>
							<AlertDialog.Description>
								This removes the platform and all {data.licenses.length} of its licenses. This cannot be undone.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
							<form method="POST" action="?/deletePlatform" use:enhance>
								<AlertDialog.Action type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
									Delete
								</AlertDialog.Action>
							</form>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</div>

			<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Save</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
