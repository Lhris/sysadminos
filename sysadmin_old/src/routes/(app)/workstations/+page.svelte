<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';

	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Status = 'available' | 'assigned' | 'in_repair' | 'flagged' | 'retired';
	type DeviceType = 'laptop' | 'desktop' | 'monitor' | 'other';

	let activeFilter = $state<Status | 'all'>('all');

	const filtered = $derived(
		activeFilter === 'all'
			? data.workstations
			: data.workstations.filter((w) => w.status === activeFilter)
	);

	const counts = $derived({
		all: data.workstations.length,
		available: data.workstations.filter((w) => w.status === 'available').length,
		assigned:  data.workstations.filter((w) => w.status === 'assigned').length,
		flagged:   data.workstations.filter((w) => w.status === 'flagged').length,
		in_repair: data.workstations.filter((w) => w.status === 'in_repair').length,
		retired:   data.workstations.filter((w) => w.status === 'retired').length
	});

	const deviceTypeLabel: Record<DeviceType, string> = {
		laptop:  'Laptop',
		desktop: 'Desktop',
		monitor: 'Monitor',
		other:   'Other'
	};

	const filters: { key: Status | 'all'; label: string }[] = [
		{ key: 'all',       label: 'All' },
		{ key: 'available', label: 'Available' },
		{ key: 'assigned',  label: 'Assigned' },
		{ key: 'flagged',   label: 'Flagged' },
		{ key: 'in_repair', label: 'In Repair' },
		{ key: 'retired',   label: 'Retired' }
	];

	const statusOptions: { value: Status; label: string }[] = [
		{ value: 'available', label: 'Available' },
		{ value: 'assigned',  label: 'Assigned' },
		{ value: 'in_repair', label: 'In Repair' },
		{ value: 'flagged',   label: 'Flagged' },
		{ value: 'retired',   label: 'Retired' }
	];
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Workstations</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.workstations.length} device{data.workstations.length === 1 ? '' : 's'} tracked
			</p>
		</div>
		<Button size="sm" href="/workstations/new">Add Workstation</Button>
	</header>

	<div class="flex items-center gap-1.5">
		{#each filters as f}
			{@const c = counts[f.key]}
			{#if c > 0 || f.key === 'all'}
				<button
					onclick={() => (activeFilter = f.key)}
					class="rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors
						{activeFilter === f.key
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{f.label}
					<span class="ml-1 text-[11px] opacity-60">{c}</span>
				</button>
			{/if}
		{/each}
	</div>

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">⬡</span>
					<p class="text-[14px] font-medium text-foreground">No workstations found</p>
					<p class="text-[13px] text-muted-foreground">
						{activeFilter === 'all' ? 'Add your first workstation to get started.' : 'No devices with this status.'}
					</p>
					{#if activeFilter === 'all'}
						<Button variant="outline" size="sm" href="/workstations/new" class="mt-1">Add Workstation</Button>
					{/if}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Serial No.</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Make / Model</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Type</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Specs</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Status</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Assigned To</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Location</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as w}
							<Table.Row>
								<Table.Cell class="py-3 pl-5 pr-3">
									<a href="/workstations/{w.id}" class="font-mono text-[13px] font-medium text-foreground no-underline hover:underline">
										{w.serialNumber}
									</a>
								</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<span class="text-[13.5px] font-medium text-foreground">{w.make}</span>
									<span class="ml-1 text-[13px] text-muted-foreground">{w.model}</span>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">
									{deviceTypeLabel[w.deviceType as DeviceType] ?? w.deviceType}
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[12.5px] text-muted-foreground">
									{[w.cpu, w.ram ? w.ram + ' RAM' : null, w.os].filter(Boolean).join(' · ') || '—'}
								</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<form method="POST" action="?/setStatus" use:enhance>
										<input type="hidden" name="id" value={w.id} />
										<select
											name="status"
											onchange={(e) => (e.currentTarget.closest('form') as HTMLFormElement).requestSubmit()}
											class="h-7 rounded-md border px-2 text-[11.5px] font-medium focus:outline-none focus:ring-1 focus:ring-ring
												{w.status === 'available' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
												 w.status === 'assigned'  ? 'border-blue-200 bg-blue-50 text-blue-700' :
												 w.status === 'in_repair' ? 'border-amber-200 bg-amber-50 text-amber-700' :
												 w.status === 'flagged'   ? 'border-red-200 bg-red-50 text-red-600' :
												                            'border-border bg-muted text-muted-foreground'}"
										>
											{#each statusOptions as opt}
												<option value={opt.value} selected={opt.value === w.status}>{opt.label}</option>
											{/each}
										</select>
									</form>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">
									{#if w.assignedEmployeeId && w.assignedEmployeeName}
										<a href="/employees/{w.assignedEmployeeId}" class="text-foreground no-underline hover:underline">
											{w.assignedEmployeeName} {w.assignedEmployeeLastName}
										</a>
									{:else}
										—
									{/if}
								</Table.Cell>
								<Table.Cell class="py-3 pl-3 pr-5 text-right text-[13px] text-muted-foreground">
									{w.location ?? '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

</main>
