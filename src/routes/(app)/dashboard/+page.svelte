<script lang="ts">
	import * as Card from '$lib/components/ui/card';
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

		<!-- Pending Checklists -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between pb-3">
				<div>
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
						Pending Checklists
					</Card.Title>
					<Card.Description>Checklist assignments with incomplete tasks</Card.Description>
				</div>
				<Button variant="ghost" size="sm" href="/checklists">View all →</Button>
			</Card.Header>
			<Card.Content class="p-0">
				{#if data.pendingChecklists.length === 0}
					<div class="px-5 py-10 text-center text-[13px] text-muted-foreground">
						No pending checklists.
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Employee</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Checklist</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Progress</Table.Head>
								<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Assigned</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.pendingChecklists as item}
								<Table.Row>
									<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] font-medium">
										<a href="/employees/{item.employeeId}" class="no-underline hover:underline text-foreground">
											{item.firstName} {item.lastName}
										</a>
									</Table.Cell>
									<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">
										<a href="/checklists/{item.id}" class="no-underline hover:underline text-foreground">
											{item.templateName}
										</a>
									</Table.Cell>
									<Table.Cell class="px-3 py-3">
										<span class="text-[13px] tabular-nums text-muted-foreground">
											{item.completed}<span class="text-border"> / </span>{item.total}
										</span>
									</Table.Cell>
									<Table.Cell class="py-3 pl-3 pr-5 text-right text-[12.5px] text-muted-foreground">
										{relativeTime(item.assignedAt)}
									</Table.Cell>
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
									{actionLabels[event.action] ?? event.action} — {event.subjectLabel}
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
