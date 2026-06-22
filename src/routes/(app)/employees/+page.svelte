<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { useEmployeeParams } from '$lib/query-params';
	import { formatDate } from '$lib/utils';
	import { COUNTRIES } from '$lib/constants';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const [params] = useEmployeeParams(page.url);

	type Status = 'active' | 'onboarding' | 'offer_pending' | 'pending_termination' | 'terminated' | 'no_status';

	// Display order — drives the tab order, the inline status menu, and the
	// default tab when none is selected.
	const STATUS_ORDER: Status[] = ['active', 'onboarding', 'offer_pending', 'pending_termination', 'terminated', 'no_status'];

	const statusMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
		active:              { label: 'Active',              variant: 'default' },
		onboarding:          { label: 'Onboarding',          variant: 'secondary' },
		offer_pending:       { label: 'Offer Pending',       variant: 'outline' },
		pending_termination: { label: 'Pending Termination', variant: 'outline' },
		terminated:          { label: 'Terminated',          variant: 'destructive' },
		no_status:           { label: 'No Status',           variant: 'outline' },
		// legacy
		offboarding:         { label: 'Pending Termination', variant: 'outline' }
	};

	const statusOptions = STATUS_ORDER.map((value) => ({ value, label: statusMeta[value].label }));

	let pendingStatusId = $state<string | null>(null);

	async function changeStatus(id: string, status: string) {
		pendingStatusId = id;
		const body = new FormData();
		body.set('employeeId', id);
		body.set('status', status);
		const res = await fetch('?/setStatus', { method: 'POST', body });
		const result = deserialize(await res.text());
		if (result.type === 'success') await invalidateAll();
		pendingStatusId = null;
	}

	const counts = $derived(
		Object.fromEntries(
			STATUS_ORDER.map((s) => [s, data.employees.filter((e) => e.status === s).length])
		) as Record<Status, number>
	);

	// No "All" tab — the list is always scoped to a single status, defaulting
	// to the first one in STATUS_ORDER.
	const activeFilter = $derived((params.status as Status) ?? STATUS_ORDER[0]);

	function setFilter(value: Status) {
		params.status = value;
	}

	let search = $state('');

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return data.employees.filter((e) => {
			if (e.status !== activeFilter) return false;
			if (!q) return true;
			return (
				`${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
				(e.microsoftEmail ?? '').toLowerCase().includes(q) ||
				(e.personalEmail ?? '').toLowerCase().includes(q) ||
				(e.role ?? '').toLowerCase().includes(q)
			);
		});
	});

	// --- Bulk selection / editing ---------------------------------------
	const roles     = $derived(data.roles);
	const countries = COUNTRIES;

	let selectedIds = $state<string[]>([]);
	let bulkBusy = $state(false);

	const selectedSet = $derived(new Set(selectedIds));
	// Only count selections that are currently visible so the bar/select-all
	// stay in sync with the active tab + search.
	const visibleSelected = $derived(filtered.filter((e) => selectedSet.has(e.id)));
	const allVisibleSelected = $derived(filtered.length > 0 && visibleSelected.length === filtered.length);

	function toggleOne(id: string) {
		selectedIds = selectedSet.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
	}

	function toggleAll() {
		if (allVisibleSelected) {
			const visible = new Set(filtered.map((e) => e.id));
			selectedIds = selectedIds.filter((id) => !visible.has(id));
		} else {
			selectedIds = [...new Set([...selectedIds, ...filtered.map((e) => e.id)])];
		}
	}

	function clearSelection() {
		selectedIds = [];
	}

	async function bulkUpdate(field: 'status' | 'role' | 'country', value: string) {
		if (visibleSelected.length === 0) return;
		bulkBusy = true;
		const body = new FormData();
		visibleSelected.forEach((e) => body.append('ids', e.id));
		body.set('field', field);
		body.set('value', value);
		const res = await fetch('?/bulkUpdate', { method: 'POST', body });
		const result = deserialize(await res.text());
		if (result.type === 'success') {
			await invalidateAll();
			clearSelection();
		}
		bulkBusy = false;
	}

	async function bulkAssignChecklist(templateId: string) {
		if (visibleSelected.length === 0) return;
		bulkBusy = true;
		const body = new FormData();
		visibleSelected.forEach((e) => body.append('ids', e.id));
		body.set('templateId', templateId);
		const res = await fetch('?/bulkAssignChecklist', { method: 'POST', body });
		const result = deserialize(await res.text());
		if (result.type === 'success') {
			await invalidateAll();
			clearSelection();
		}
		bulkBusy = false;
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Employees</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.employees.length} total · {counts.onboarding} onboarding · {counts.terminated} terminated
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" href="/employees/roles">View Roles</Button>
			<Button href="/employees/new" size="sm">Add Employee</Button>
		</div>
	</header>

	<div class="flex items-center justify-between gap-3">
		<div class="flex items-center gap-1.5">
			{#each STATUS_ORDER as s}
				<button
					onclick={() => setFilter(s)}
					class="rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors
						{activeFilter === s
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{statusMeta[s].label}
					<span class="ml-1 text-[11px] opacity-60">{counts[s]}</span>
				</button>
			{/each}
		</div>

		<div class="relative w-64 shrink-0">
			<svg class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="7" />
				<path stroke-linecap="round" d="m21 21-4.3-4.3" />
			</svg>
			<Input bind:value={search} placeholder="Search employees…" class="h-9 pl-9 text-[13px]" />
		</div>
	</div>

	{#if visibleSelected.length > 0}
		<div class="flex items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
			<span class="text-[13px] font-medium text-foreground">{visibleSelected.length} selected</span>
			<span class="text-muted-foreground/40">·</span>

			{#snippet bulkMenu(label: string, field: 'status' | 'role' | 'country', options: { value: string; label: string }[])}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline" size="sm" disabled={bulkBusy} class="h-7 gap-1.5 text-[12px]">
								{label}
								<svg class="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
								</svg>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-48">
						{#each options as o}
							<DropdownMenu.Item class="text-[13px]" onSelect={() => bulkUpdate(field, o.value)}>{o.label}</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/snippet}

			{@render bulkMenu('Set status', 'status', statusOptions)}
			{@render bulkMenu('Set role', 'role', roles.map((r) => ({ value: r, label: r })))}
			{@render bulkMenu('Set country', 'country', countries.map((c) => ({ value: c, label: c })))}

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" disabled={bulkBusy || data.templates.length === 0} class="h-7 gap-1.5 text-[12px]">
							Assign checklist
							<svg class="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
							</svg>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-56">
					{#each data.templates as t (t.id)}
						<DropdownMenu.Item class="text-[13px]" onSelect={() => bulkAssignChecklist(t.id)}>{t.name}</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<button type="button" onclick={clearSelection} class="ml-auto text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
				Clear
			</button>
		</div>
	{/if}

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◈</span>
					<p class="text-[14px] font-medium text-foreground">No employees found</p>
					<p class="text-[13px] text-muted-foreground">
						{search.trim()
							? `No ${statusMeta[activeFilter].label} employees match “${search.trim()}”.`
							: `No employees with status “${statusMeta[activeFilter].label}”.`}
					</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-0 pl-5 pr-2">
								<input
									type="checkbox"
									checked={allVisibleSelected}
									onchange={toggleAll}
									aria-label="Select all"
									class="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground align-middle"
								/>
							</Table.Head>
							<Table.Head class="pl-1 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Role</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Country</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Microsoft Email</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Start Date</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Status</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as emp}
							<Table.Row class="group {selectedSet.has(emp.id) ? 'bg-accent/30' : ''}">
								<Table.Cell class="w-0 py-3 pl-5 pr-2">
									<input
										type="checkbox"
										checked={selectedSet.has(emp.id)}
										onchange={() => toggleOne(emp.id)}
										aria-label="Select {emp.firstName} {emp.lastName}"
										class="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground align-middle"
									/>
								</Table.Cell>
								<Table.Cell class="py-3 pl-1 pr-3">
									<div class="flex flex-col gap-[2px]">
										<span class="text-[13.5px] font-medium text-foreground">{emp.firstName} {emp.lastName}</span>
										<span class="text-[11.5px] text-muted-foreground">{emp.personalEmail ?? ''}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{emp.role}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{emp.country}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">{emp.microsoftEmail}</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{formatDate(emp.startDate)}</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<button {...props} disabled={pendingStatusId === emp.id} class="outline-none disabled:opacity-50">
													<Badge variant={statusMeta[emp.status as Status]?.variant ?? 'outline'} class="cursor-pointer gap-1 text-[11px]">
														{statusMeta[emp.status as Status]?.label ?? emp.status}
														<svg class="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
															<path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
														</svg>
													</Badge>
												</button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="start" class="w-44">
											<DropdownMenu.RadioGroup value={emp.status} onValueChange={(v) => changeStatus(emp.id, v)}>
												{#each statusOptions as s}
													<DropdownMenu.RadioItem value={s.value} class="text-[13px]">{s.label}</DropdownMenu.RadioItem>
												{/each}
											</DropdownMenu.RadioGroup>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
								<Table.Cell class="py-3 pl-3 pr-5 text-right">
									<Button variant="ghost" size="sm" href="/employees/{emp.id}" class="h-7 px-2 text-[12px] opacity-0 transition-opacity group-hover:opacity-100">
										View →
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

</main>
