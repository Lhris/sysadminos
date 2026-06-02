<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { relativeTime, formatDate } from '$lib/utils';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const ws = $derived(data.workstation);

	type Status = 'available' | 'assigned' | 'in_repair' | 'flagged' | 'retired';
	type DeviceType = 'laptop' | 'desktop' | 'monitor' | 'other';

	const statusBadge: Record<Status, { label: string; cls: string }> = {
		available: { label: 'Available', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
		assigned:  { label: 'Assigned',  cls: 'border-blue-200 bg-blue-50 text-blue-700' },
		in_repair: { label: 'In Repair', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
		flagged:   { label: 'Flagged',   cls: 'border-red-200 bg-red-50 text-red-600' },
		retired:   { label: 'Retired',   cls: 'border-border bg-muted text-muted-foreground' }
	};

	const deviceTypeLabel: Record<DeviceType, string> = {
		laptop: 'Laptop', desktop: 'Desktop', monitor: 'Monitor', other: 'Other'
	};

	function eventLabel(action: string, metadata: string | null): string {
		const meta = metadata ? JSON.parse(metadata) as { related?: { label?: string }; from?: { label?: string }; to?: { label?: string } } : null;
		if (action === 'workstation.reassigned') {
			const from = meta?.from?.label;
			const to   = meta?.to?.label;
			return from && to ? `Reassigned from ${from} to ${to}` : 'Reassigned';
		}
		const related = meta?.related?.label;
		if (action === 'workstation.assigned')   return related ? `Assigned to ${related}`     : 'Assigned to employee';
		if (action === 'workstation.unassigned') return related ? `Unassigned from ${related}` : 'Unassigned from employee';
		if (action === 'workstation.created')      return 'Workstation created';
		if (action === 'workstation.updated')      return 'Details updated';
		if (action === 'workstation.status_changed') {
			const m = metadata ? JSON.parse(metadata) as { from?: string; to?: string } : null;
			return m?.from && m?.to ? `Status changed from ${m.from} to ${m.to}` : 'Status changed';
		}
		return action;
	}

	const statusOptions: { value: Status; label: string }[] = [
		{ value: 'available', label: 'Available' },
		{ value: 'assigned',  label: 'Assigned' },
		{ value: 'in_repair', label: 'In Repair' },
		{ value: 'flagged',   label: 'Flagged' },
		{ value: 'retired',   label: 'Retired' }
	];

	const deviceTypeOptions: { value: DeviceType; label: string }[] = [
		{ value: 'laptop',  label: 'Laptop' },
		{ value: 'desktop', label: 'Desktop' },
		{ value: 'monitor', label: 'Monitor' },
		{ value: 'other',   label: 'Other' }
	];

	let noteBody = $state('');
	let noteTextarea: HTMLTextAreaElement | undefined = $state(undefined);

	let sheetOpen    = $state(false);
	let showAssign   = $state(false);
	let showAddEntry = $state(false);
	let editingEntryId = $state<string | null>(null);

	const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

	const sb = $derived(statusBadge[ws.status as Status]);
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/workstations" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Workstations
	</a>

	<header class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div>
				<div class="flex items-center gap-3">
					<h1 class="font-mono text-[24px] leading-none tracking-[-0.02em]">{ws.serialNumber}</h1>
					<Badge variant="outline" class="text-[11px] font-medium {sb.cls}">{sb.label}</Badge>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">
					{ws.make} {ws.model} · {deviceTypeLabel[ws.deviceType as DeviceType] ?? ws.deviceType}
				</p>
			</div>
		</div>
		<Sheet.Root bind:open={sheetOpen}>
			<Sheet.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>Edit</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content class="flex flex-col gap-0 p-0 sm:max-w-[480px]">
				<Sheet.Header class="border-b px-6 py-4">
					<Sheet.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
						Edit Workstation
					</Sheet.Title>
				</Sheet.Header>

				<form
					method="POST"
					action="?/update"
					use:enhance={() => async ({ result, update }) => {
						if (result.type === 'success') sheetOpen = false;
						await update();
					}}
					class="flex flex-1 flex-col overflow-hidden"
				>
					<div class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">

						<!-- Status -->
						<div class="flex flex-col gap-1.5">
							<Label for="edit-status">Status</Label>
							<select id="edit-status" name="status" class={selectClass}>
								{#each statusOptions as opt}
									<option value={opt.value} selected={opt.value === ws.status}>{opt.label}</option>
								{/each}
							</select>
						</div>

						<div class="border-t"></div>

						<!-- Device -->
						<div class="flex flex-col gap-4">
							<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Device</p>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="edit-serial">Serial Number</Label>
									<Input id="edit-serial" name="serialNumber" value={ws.serialNumber} />
								</div>
								<div class="flex flex-col gap-1.5">
									<Label for="edit-type">Type</Label>
									<select id="edit-type" name="deviceType" class={selectClass}>
										{#each deviceTypeOptions as opt}
											<option value={opt.value} selected={opt.value === ws.deviceType}>{opt.label}</option>
										{/each}
									</select>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="edit-make">Make</Label>
									<Input id="edit-make" name="make" value={ws.make} />
								</div>
								<div class="flex flex-col gap-1.5">
									<Label for="edit-model">Model</Label>
									<Input id="edit-model" name="model" value={ws.model} />
								</div>
							</div>
						</div>

						<div class="border-t"></div>

						<!-- Specs -->
						<div class="flex flex-col gap-4">
							<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Specs</p>
							<div class="grid grid-cols-3 gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="edit-os">OS</Label>
									<Input id="edit-os" name="os" value={ws.os ?? ''} />
								</div>
								<div class="flex flex-col gap-1.5">
									<Label for="edit-cpu">CPU</Label>
									<Input id="edit-cpu" name="cpu" value={ws.cpu ?? ''} />
								</div>
								<div class="flex flex-col gap-1.5">
									<Label for="edit-ram">RAM</Label>
									<Input id="edit-ram" name="ram" value={ws.ram ?? ''} />
								</div>
							</div>
						</div>

						<div class="border-t"></div>

						<!-- Details -->
						<div class="flex flex-col gap-4">
							<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Details</p>
							<div class="flex flex-col gap-1.5">
								<Label for="edit-location">Location</Label>
								<Input id="edit-location" name="location" value={ws.location ?? ''} />
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="edit-order">Order Date</Label>
									<Input id="edit-order" name="orderDate" type="date" value={ws.orderDate ?? ''} />
								</div>
								<div class="flex flex-col gap-1.5">
									<Label for="edit-warranty">Warranty Expiry</Label>
									<Input id="edit-warranty" name="warrantyExpiry" type="date" value={ws.warrantyExpiry ?? ''} />
								</div>
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="edit-notes">Notes</Label>
								<textarea
									id="edit-notes"
									name="notes"
									rows="3"
									class="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
								>{ws.notes ?? ''}</textarea>
							</div>
						</div>

						{#if form?.updateError}
							<p class="text-[12px] text-destructive">{form.updateError}</p>
						{/if}

					</div>

					<div class="flex items-center justify-end gap-2 border-t px-6 py-4">
						<Sheet.Close>
							{#snippet child({ props })}
								<Button variant="outline" size="sm" type="button" {...props}>Cancel</Button>
							{/snippet}
						</Sheet.Close>
						<Button type="submit" size="sm">Save changes</Button>
					</div>
				</form>

			</Sheet.Content>
		</Sheet.Root>
	</header>

	<div class="grid grid-cols-[1fr_360px] items-start gap-4">

		<!-- Left column -->
		<div class="flex flex-col gap-4">

			<!-- Device -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Device</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-0">

					{#snippet row(label: string, value: string | null | undefined, mono = false)}
						<div class="flex items-start justify-between gap-4 py-3 [&:not(:last-child)]:border-b">
							<span class="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
							<span class="text-right text-[13.5px] text-foreground {mono ? 'font-mono' : ''}">{value ?? '—'}</span>
						</div>
					{/snippet}

					{@render row('Serial Number', ws.serialNumber, true)}
					{@render row('Make', ws.make)}
					{@render row('Model', ws.model)}
					{@render row('Type', deviceTypeLabel[ws.deviceType as DeviceType] ?? ws.deviceType)}
					{@render row('OS', ws.os)}
					{@render row('CPU', ws.cpu)}
					{@render row('RAM', ws.ram)}

				</Card.Content>
			</Card.Root>

			<!-- Details -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Details</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-0">

					{#snippet row(label: string, value: string | null | undefined)}
						<div class="flex items-start justify-between gap-4 py-3 [&:not(:last-child)]:border-b">
							<span class="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
							<span class="text-right text-[13.5px] text-foreground">{value ?? '—'}</span>
						</div>
					{/snippet}

					{@render row('Location', ws.location)}
					{@render row('Order Date', formatDate(ws.orderDate))}
					{@render row('Warranty Expiry', formatDate(ws.warrantyExpiry))}
					{@render row('Notes', ws.notes)}

				</Card.Content>
			</Card.Root>

			<!-- Assignment -->
			<Card.Root class="overflow-hidden">
				<Card.Header class="flex flex-row items-center justify-between pb-3">
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Assignment</Card.Title>
					{#if ws.status !== 'retired'}
						<button
							type="button"
							onclick={() => (showAssign = !showAssign)}
							class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							{showAssign ? 'Cancel' : ws.assignedEmployeeId ? 'Reassign' : '+ Assign'}
						</button>
					{/if}
				</Card.Header>
				<Card.Content class="flex flex-col gap-0 p-0">

					{#if showAssign}
						<form
							method="POST"
							action="?/assign"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') showAssign = false;
									await update();
								};
							}}
							class="border-b px-5 py-4"
						>
							<div class="flex gap-2">
								<select name="employeeId" class={selectClass}>
									<option value="" disabled selected>Select employee</option>
									{#each data.employees as emp}
										<option value={emp.id}>{emp.firstName} {emp.lastName}</option>
									{/each}
								</select>
								<Button type="submit" size="sm" class="shrink-0">Assign</Button>
							</div>
							{#if form?.assignError}
								<p class="mt-2 text-[12px] text-destructive">{form.assignError}</p>
							{/if}
						</form>
					{/if}

					{#if ws.assignedEmployeeId && ws.assignedEmployeeFirstName}
						<div class="flex items-center justify-between px-5 py-[11px]">
							<div class="flex flex-col gap-[3px]">
								<a
									href="/employees/{ws.assignedEmployeeId}"
									class="text-[13.5px] font-medium text-foreground no-underline hover:underline"
								>
									{ws.assignedEmployeeFirstName} {ws.assignedEmployeeLastName}
								</a>
								<span class="text-[12px] text-muted-foreground">Currently assigned</span>
							</div>
							<form method="POST" action="?/unassign" use:enhance>
								<button
									type="submit"
									class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-destructive"
								>
									Unassign
								</button>
							</form>
						</div>
					{:else}
						<div class="px-5 py-8 text-center">
							<p class="text-[13px] text-muted-foreground">Not currently assigned.</p>
						</div>
					{/if}

				</Card.Content>
			</Card.Root>

		<!-- Assignment History -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between pb-3">
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Assignment History</Card.Title>
				<button
					type="button"
					onclick={() => { showAddEntry = !showAddEntry; editingEntryId = null; }}
					class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					{showAddEntry ? 'Cancel' : '+ Add'}
				</button>
			</Card.Header>
			<Card.Content class="p-0">

				<!-- header -->
				<div class="grid grid-cols-[90px_90px_1fr_1fr_80px] gap-2 border-b px-4 py-2">
					<span class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Start</span>
					<span class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">End</span>
					<span class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Person</span>
					<span class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Label</span>
					<span></span>
				</div>

				{#if showAddEntry}
					<form
						method="POST"
						action="?/addEntry"
						use:enhance={() => async ({ result, update }) => {
							if (result.type === 'success') showAddEntry = false;
							await update();
						}}
						class="grid grid-cols-[90px_90px_1fr_1fr_80px] items-center gap-2 border-b px-4 py-2"
					>
						<input type="date" name="startAt" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
						<input type="date" name="endAt" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
						<select name="employeeId" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring">
							<option value="">—</option>
							{#each data.employees as emp}
								<option value={emp.id}>{emp.firstName} {emp.lastName}</option>
							{/each}
						</select>
						<input type="text" name="label" placeholder="e.g. Pending Recall" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
						<div class="flex items-center gap-2">
							<Button type="submit" size="sm" class="h-7 text-[12px]">Add</Button>
							<button type="button" onclick={() => showAddEntry = false} class="text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
						</div>
					</form>
					{#if form?.entryError}
						<p class="px-4 pb-2 text-[12px] text-destructive">{form.entryError}</p>
					{/if}
				{/if}

				{#if data.timeline.length === 0 && !showAddEntry}
					<div class="px-5 py-8 text-center">
						<p class="text-[13px] text-muted-foreground">No history recorded yet.</p>
					</div>
				{:else}
					{#each data.timeline as entry}
						{#if editingEntryId === entry.id}
							<form
								method="POST"
								action="?/updateEntry"
								use:enhance={() => async ({ result, update }) => {
									if (result.type === 'success') editingEntryId = null;
									await update();
								}}
								class="grid grid-cols-[90px_90px_1fr_1fr_80px] items-center gap-2 border-b border-border/60 px-4 py-2 last:border-b-0"
							>
								<input type="hidden" name="id" value={entry.id} />
								<input type="date" name="startAt" value={entry.startAt ?? ''} class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
								<input type="date" name="endAt" value={entry.endAt ?? ''} class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
								<select name="employeeId" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring">
									<option value="">—</option>
									{#each data.employees as emp}
										<option value={emp.id} selected={emp.id === entry.employeeId}>{emp.firstName} {emp.lastName}</option>
									{/each}
								</select>
								<input type="text" name="label" value={entry.label ?? ''} placeholder="e.g. Pending Recall" class="h-8 rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
								<div class="flex items-center gap-2">
									<button type="submit" class="text-[12px] font-medium text-foreground">Save</button>
									<button type="button" onclick={() => editingEntryId = null} class="text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
								</div>
							</form>
						{:else}
							<div class="grid grid-cols-[90px_90px_1fr_1fr_80px] items-center gap-2 border-b border-border/60 px-4 py-2 last:border-b-0">
								<span class="text-[12.5px] text-muted-foreground">{entry.startAt ? formatDate(entry.startAt) : '—'}</span>
								<span class="text-[12.5px] text-muted-foreground">{entry.endAt ? formatDate(entry.endAt) : '(current)'}</span>
								<span class="text-[13px] text-foreground">
									{#if entry.employeeId && entry.employeeFirstName}
										<a href="/employees/{entry.employeeId}" class="no-underline hover:underline">{entry.employeeFirstName} {entry.employeeLastName}</a>
									{:else}
										—
									{/if}
								</span>
								<span class="text-[13px] text-muted-foreground">{entry.label ?? '—'}</span>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => { editingEntryId = entry.id; showAddEntry = false; }}
										class="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
									>Edit</button>
									<form method="POST" action="?/deleteEntry" use:enhance>
										<input type="hidden" name="id" value={entry.id} />
										<button type="submit" class="text-[12px] text-muted-foreground transition-colors hover:text-destructive">Delete</button>
									</form>
								</div>
							</div>
						{/if}
					{/each}
				{/if}

			</Card.Content>
		</Card.Root>

		</div>

		<!-- Right column -->
		<div class="flex flex-col gap-4">

		<!-- Notes -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="pb-3">
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Notes</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-0 p-0">

				<form
					method="POST"
					action="?/addNote"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') noteBody = '';
							await update();
						};
					}}
					class="border-b px-4 py-3"
				>
					<textarea
						bind:this={noteTextarea}
						name="body"
						bind:value={noteBody}
						placeholder="Add a note…"
						rows="2"
						onkeydown={(e) => {
							if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
								e.preventDefault();
								(e.currentTarget.closest('form') as HTMLFormElement)?.requestSubmit();
							}
						}}
						class="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					></textarea>
					<div class="mt-2 flex items-center justify-between">
						{#if form?.noteError}
							<p class="text-[12px] text-destructive">{form.noteError}</p>
						{:else}
							<span class="text-[11px] text-muted-foreground">⌘↵ to save</span>
						{/if}
						<Button type="submit" size="sm" variant="outline" class="h-7 text-[12px]">Save note</Button>
					</div>
				</form>

				{#if data.notes.length === 0}
					<div class="px-5 py-8 text-center">
						<p class="text-[13px] text-muted-foreground">No notes yet.</p>
					</div>
				{:else}
					{#each data.notes as n}
						<div class="flex items-start gap-3 border-b border-border/60 px-5 py-3 last:border-b-0">
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-[13px] text-foreground">{n.body}</span>
								{#if n.authorLabel}
									<span class="text-[11.5px] text-muted-foreground">{n.authorLabel}</span>
								{/if}
							</div>
							<span class="shrink-0 text-[11px] text-muted-foreground" title={n.createdAt?.toLocaleString()}>
								{relativeTime(n.createdAt)}
							</span>
						</div>
					{/each}
				{/if}

			</Card.Content>
		</Card.Root>

		<!-- Activity -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between pb-3">
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Activity</Card.Title>
				<a href="/audit" class="text-[12px] font-medium text-muted-foreground no-underline hover:text-foreground">
					Full log →
				</a>
			</Card.Header>
			<Card.Content class="p-0">
				{#if data.events.length === 0}
					<div class="px-5 py-10 text-center">
						<p class="text-[13px] text-muted-foreground">No activity recorded yet.</p>
					</div>
				{:else}
					{#each data.events as event}
						<div class="flex items-start gap-3 border-b border-border/60 px-5 py-3 last:border-b-0">
							<div class="mt-0.5 h-[6px] w-[6px] shrink-0 rounded-full bg-muted-foreground/50"></div>
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-[13px] font-medium text-foreground">
									{eventLabel(event.action, event.metadata)}
								</span>
								{#if event.actorLabel}
									<span class="text-[11.5px] text-muted-foreground">by {event.actorLabel}</span>
								{/if}
							</div>
							<span class="shrink-0 text-[11px] text-muted-foreground" title={event.createdAt?.toLocaleString()}>
								{relativeTime(event.createdAt)}
							</span>
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

		</div>

	</div>

</main>
