<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Status = 'active' | 'onboarding' | 'offboarding' | 'terminated';

	const validStatuses: (Status | 'all')[] = ['all', 'active', 'onboarding', 'offboarding', 'terminated'];
	const activeFilter = $derived.by<Status | 'all'>(() => {
		const s = page.url.searchParams.get('status');
		return validStatuses.includes(s as Status | 'all') ? (s as Status | 'all') : 'all';
	});

	const statusMeta: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
		active:      { label: 'Active',      variant: 'default' },
		onboarding:  { label: 'Onboarding',  variant: 'secondary' },
		offboarding: { label: 'Offboarding', variant: 'outline' },
		terminated:  { label: 'Terminated',  variant: 'destructive' }
	};

	const filters: { label: string; value: Status | 'all' }[] = [
		{ label: 'All', value: 'all' },
		{ label: 'Active', value: 'active' },
		{ label: 'Onboarding', value: 'onboarding' },
		{ label: 'Offboarding', value: 'offboarding' },
		{ label: 'Terminated', value: 'terminated' }
	];

	const counts = $derived({
		all: data.employees.length,
		active: data.employees.filter((e) => e.status === 'active').length,
		onboarding: data.employees.filter((e) => e.status === 'onboarding').length,
		offboarding: data.employees.filter((e) => e.status === 'offboarding').length,
		terminated: data.employees.filter((e) => e.status === 'terminated').length
	});

	const filtered = $derived(
		activeFilter === 'all'
			? data.employees
			: data.employees.filter((e) => e.status === activeFilter)
	);

	function formatDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<!-- Header -->
	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Employees</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{counts.all} total · {counts.onboarding} onboarding · {counts.terminated} terminated
			</p>
		</div>
		<Button href="/employees/new" size="sm">Add Employee</Button>
	</header>

	<!-- Filter Bar -->
	<div class="flex items-center gap-1.5">
		{#each filters as f}
			<button
				onclick={() => {
					const url = new URL(page.url);
					if (f.value === 'all') url.searchParams.delete('status');
					else url.searchParams.set('status', f.value);
					goto(url.toString(), { replaceState: true });
				}}
				class="rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors
					{activeFilter === f.value
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
			>
				{f.label}
				<span class="ml-1 text-[11px] opacity-60">{counts[f.value]}</span>
			</button>
		{/each}
	</div>

	<!-- Table -->
	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◈</span>
					<p class="text-[14px] font-medium text-foreground">No employees found</p>
					<p class="text-[13px] text-muted-foreground">
						{activeFilter === 'all' ? 'Add your first employee to get started.' : `No employees with status "${activeFilter}".`}
					</p>
					{#if activeFilter === 'all'}
						<Button href="/employees/new" size="sm" class="mt-1">Add Employee</Button>
					{/if}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
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
							<Table.Row class="group">
								<Table.Cell class="py-3 pl-5 pr-3">
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
									<Badge variant={statusMeta[emp.status as Status].variant} class="text-[11px]">
										{statusMeta[emp.status as Status].label}
									</Badge>
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
