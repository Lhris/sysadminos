<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { relativeTime } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{
			label: 'Employees',
			value: String(data.employeeCount),
			sub: `${data.onboardingCount} onboarding`,
			href: '/employees'
		},
		{
			label: 'Workstations',
			value: String(data.workstationCount),
			sub: `${data.flaggedCount} flagged`,
			href: '/workstations'
		},
		{
			label: 'Open Orders',
			value: '—',
			sub: 'no orders',
			href: '/orders'
		},
		{
			label: 'Audit Events',
			value: String(data.auditTodayCount),
			sub: 'this week',
			href: '/audit'
		}
	]);


	const actionLabels: Record<string, string> = {
		'employee.created':        'Employee created',
		'employee.updated':        'Profile updated',
		'employee.status_changed': 'Status changed',
		'employee.terminated':     'Employee terminated',
		'workstation.created':     'Workstation added',
		'workstation.assigned':    'Workstation assigned',
		'workstation.unassigned':  'Workstation unassigned',
		'order.created':           'Order created',
		'order.fulfilled':         'Order fulfilled',
		'order.cancelled':         'Order cancelled'
	};

	const today = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(new Date());

	function parseLocalDate(dateStr: string) {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	function startInfo(dateStr: string | null | undefined) {
		if (!dateStr) return { label: '—', cls: 'text-muted-foreground' };
		const start = parseLocalDate(dateStr);
		const now = new Date(); now.setHours(0, 0, 0, 0);
		const diff = Math.round((start.getTime() - now.getTime()) / 86_400_000);
		const abs = Math.abs(diff);
		const days = abs === 1 ? '1 day' : `${abs} days`;
		if (diff > 0)   return { label: `in ${days}`,      cls: 'text-muted-foreground' };
		if (diff === 0) return { label: 'today',            cls: 'text-muted-foreground' };
		if (abs <= 14)  return { label: `${days} overdue`, cls: 'text-amber-600' };
		return                 { label: `${days} overdue`, cls: 'text-red-600' };
	}

	function statusBadge(dateStr: string | null | undefined) {
		if (!dateStr) return { label: 'Pending', cls: 'border-border bg-muted text-muted-foreground' };
		const start = parseLocalDate(dateStr);
		const now = new Date(); now.setHours(0, 0, 0, 0);
		const diff = Math.round((now.getTime() - start.getTime()) / 86_400_000);
		if (diff < 0)   return { label: 'Pending',    cls: 'border-border bg-muted text-muted-foreground' };
		if (diff <= 30) return { label: 'Onboarding', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
		return                 { label: 'Extended',   cls: 'border-amber-200 bg-amber-50 text-amber-700' };
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<!-- Header -->
	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Dashboard</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">{today}</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" href="/employees/new">New Employee</Button>
			<Button size="sm" href="/orders/new">New Order</Button>
		</div>
	</header>

	<!-- Stat Cards -->
	<div class="grid grid-cols-4 gap-3">
		{#each stats as stat}
			<a href={stat.href} class="no-underline">
				<Card.Root class="cursor-pointer transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.10)]">
					<Card.Content class="flex items-center gap-4 px-[22px] py-5">
						<span class="shrink-0 font-heading text-[32px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
							{stat.value}
						</span>
						<div class="flex flex-col gap-[3px]">
							<span class="text-[13px] font-medium leading-none text-foreground">{stat.label}</span>
							<span class="text-[12px] text-muted-foreground">{stat.sub}</span>
						</div>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<!-- Content Grid -->
	<div class="grid grid-cols-[1fr_300px] items-start gap-3">

		<!-- Left Column -->
		<div class="flex flex-col gap-3">

		<!-- Onboarding Table -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between pb-3">
				<div>
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
						Onboarding Pipeline
					</Card.Title>
					<Card.Description>Employees currently in onboarding</Card.Description>
				</div>
				<Button variant="ghost" size="sm" href="/employees">View all →</Button>
			</Card.Header>
			<Card.Content class="p-0">
				{#if data.onboarding.length === 0}
					<div class="px-5 py-10 text-center text-[13px] text-muted-foreground">
						No employees currently onboarding.
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Role</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Status</Table.Head>
								<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Start</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.onboarding as emp}
								{@const sb = statusBadge(emp.startDate)}
								{@const si = startInfo(emp.startDate)}
								<Table.Row class="group">
									<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] font-medium">
										<a href="/employees/{emp.id}" class="no-underline hover:underline text-foreground">
											{emp.firstName} {emp.lastName}
										</a>
									</Table.Cell>
									<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{emp.role}</Table.Cell>
									<Table.Cell class="px-3 py-3">
										<Badge variant="outline" class="text-[11px] font-medium {sb.cls}">{sb.label}</Badge>
									</Table.Cell>
									<Table.Cell class="py-3 pl-3 pr-5 text-right text-[12.5px] {si.cls}">{si.label}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Recent Activity -->
		<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-3">
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
						Recent Activity
					</Card.Title>
					<Button variant="ghost" size="sm" href="/audit">All →</Button>
				</Card.Header>
				<Card.Content class="p-0">
					{#if data.recentAudit.length === 0}
						<div class="px-5 py-8 text-center text-[13px] text-muted-foreground">
							No activity yet.
						</div>
					{:else}
						{#each data.recentAudit as event}
							<div class="flex items-center gap-2.5 border-b border-border/60 px-5 py-[11px] last:border-b-0">
								<span class="h-[5px] w-[5px] shrink-0 rounded-full bg-muted-foreground"></span>
								<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-foreground">
									{actionLabels[event.action] ?? event.action} — {event.entityLabel}
								</span>
								<span
									class="whitespace-nowrap text-[11px] text-muted-foreground"
									title={event.createdAt?.toLocaleString()}
								>
									{relativeTime(event.createdAt)}
								</span>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>

		</div><!-- end left column -->

		<!-- Right Column -->
		<div class="flex flex-col gap-3">

			<!-- Active Onboarding -->
			<Card.Root>
				<Card.Content class="px-5 py-[18px]">
					<div class="mb-3 flex items-center gap-2">
						<span class="h-[7px] w-[7px] shrink-0 rounded-full bg-foreground"></span>
						<span class="font-heading text-[13px] font-bold tracking-[-0.01em] text-foreground">
							Active Onboarding
						</span>
					</div>
					<p class="font-heading text-[40px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
						{data.onboardingCount}
					</p>
					<p class="mt-1.5 text-[12.5px] text-muted-foreground">
						{data.onboardingCount === 1 ? 'employee' : 'employees'} currently being onboarded
					</p>
					<Button variant="outline" size="sm" href="/employees?status=onboarding" class="mt-4 w-full">
						View Onboarding →
					</Button>
				</Card.Content>
			</Card.Root>

			<!-- Active Terminations -->
			<Card.Root class="border-[rgba(192,57,43,0.2)] bg-[rgba(192,57,43,0.03)]">
				<Card.Content class="px-5 py-[18px]">
					<div class="mb-3 flex items-center gap-2">
						<span class="h-[7px] w-[7px] shrink-0 rounded-full bg-[#c0392b]"></span>
						<span class="font-heading text-[13px] font-bold tracking-[-0.01em] text-[#c0392b]">
							Active Terminations
						</span>
					</div>
					<p class="font-heading text-[40px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
						{data.terminationCount}
					</p>
					<p class="mt-1.5 text-[12.5px] text-muted-foreground">
						{data.terminationCount === 1 ? 'employee' : 'employees'} currently being offboarded
					</p>
					<Button variant="outline" size="sm" href="/employees?status=offboarding" class="mt-4 w-full">
						View Terminations →
					</Button>
				</Card.Content>
			</Card.Root>

		</div>
	</div>

</main>
