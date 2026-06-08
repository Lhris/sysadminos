<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
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
		weekday: 'long', month: 'long', day: 'numeric'
	}).format(new Date());
</script>

<svelte:head>
	<link rel="preconnect" href="https://api.fontshare.com" />
	<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&display=swap" rel="stylesheet" />
</svelte:head>

<main class="relative flex min-h-screen min-w-0 flex-1 flex-col gap-7 overflow-y-auto px-10 py-9">

	<!-- Background orbs -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(200,200,195,0.35)_0%,transparent_70%)]"></div>
		<div class="absolute -bottom-24 -right-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(180,180,175,0.25)_0%,transparent_70%)]"></div>
	</div>

	<!-- Header -->
	<header class="relative flex items-end justify-between">
		<div>
			<p class="text-[12px] font-medium uppercase tracking-[0.08em] text-[#737373]">{today}</p>
			<h1 class="mt-1 font-['Cabinet_Grotesk'] text-[38px] font-extrabold leading-none tracking-[-0.04em] text-[#0a0a0a]">
				Dashboard
			</h1>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" href="/employees/new" class="bg-white/70 backdrop-blur-sm">New Employee</Button>
			<Button size="sm" href="/orders/new">New Order</Button>
		</div>
	</header>

	<!-- Stat Cards -->
	<div class="relative grid grid-cols-4 gap-3">
		{#each stats as stat}
			<a href={stat.href} class="no-underline">
				<div class="group rounded-2xl border border-black/[0.06] bg-white/65 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-[3px] hover:bg-white/80 hover:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.11)]">
					<p class="text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">{stat.label}</p>
					<p class="mt-2 font-['Cabinet_Grotesk'] text-[36px] font-extrabold leading-none tracking-[-0.04em] text-[#0a0a0a]">
						{stat.value}
					</p>
					<p class="mt-1.5 text-[12px] text-[#737373]">{stat.sub}</p>
				</div>
			</a>
		{/each}
	</div>

	<!-- Content Grid -->
	<div class="relative grid grid-cols-[1fr_288px] items-start gap-3">

		<!-- Left Column -->
		<div class="flex flex-col gap-3">

			<!-- Employees with Pending Checklists -->
			<div class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/65 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] backdrop-blur-xl">
				<div class="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
					<div>
						<p class="font-['Cabinet_Grotesk'] text-[15px] font-bold tracking-[-0.02em] text-[#0a0a0a]">Employees with Pending Checklists</p>
						<p class="mt-0.5 text-[12px] text-[#737373]">Grouped by employee — checklists still in progress</p>
					</div>
					<a href="/checklists" class="text-[12px] font-medium text-[#737373] no-underline transition-colors hover:text-[#0a0a0a]">View all →</a>
				</div>

				{#if data.pendingChecklists.length === 0}
					<div class="px-5 py-10 text-center text-[13px] text-[#737373]">No pending checklists.</div>
				{:else}
					{#each data.pendingChecklists as emp}
						<a href="/employees/{emp.employeeId}?tab=checklist"
							class="flex items-center gap-3 border-b border-black/[0.04] px-5 py-3.5 last:border-b-0 no-underline transition-colors hover:bg-black/[0.02]">
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[12px] font-bold text-white">
								{emp.firstName[0]}{emp.lastName[0]}
							</div>
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-[13.5px] font-medium text-[#0a0a0a]">{emp.firstName} {emp.lastName}</span>
								<span class="text-[12px] text-[#737373]">
									{emp.pending} {emp.pending === 1 ? 'checklist' : 'checklists'} left · {emp.stepsLeft} {emp.stepsLeft === 1 ? 'step' : 'steps'} left
								</span>
							</div>
							<div class="flex shrink-0 items-center gap-2.5">
								<div class="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.08]">
									<div class="h-full rounded-full bg-[#0a0a0a] transition-all"
										style="width: {emp.totalSteps > 0 ? Math.round(((emp.totalSteps - emp.stepsLeft) / emp.totalSteps) * 100) : 0}%">
									</div>
								</div>
								<span class="w-20 text-right text-[11.5px] tabular-nums text-[#737373]">
									{emp.totalSteps - emp.stepsLeft}/{emp.totalSteps} completed
								</span>
							</div>
						</a>
					{/each}
				{/if}
			</div>

			<!-- Recent Activity -->
			<div class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/65 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] backdrop-blur-xl">
				<div class="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
					<p class="font-['Cabinet_Grotesk'] text-[15px] font-bold tracking-[-0.02em] text-[#0a0a0a]">Recent Activity</p>
					<a href="/audit" class="text-[12px] font-medium text-[#737373] no-underline transition-colors hover:text-[#0a0a0a]">All →</a>
				</div>
				{#if data.recentAudit.length === 0}
					<div class="px-5 py-8 text-center text-[13px] text-[#737373]">No activity yet.</div>
				{:else}
					{#each data.recentAudit as event}
						<div class="flex items-center gap-2.5 border-b border-black/[0.04] px-5 py-3 last:border-b-0">
							<span class="h-[5px] w-[5px] shrink-0 rounded-full bg-[#737373]"></span>
							<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-[#0a0a0a]">
								{actionLabels[event.action] ?? event.action} — {event.subjectLabel}
							</span>
							<span class="whitespace-nowrap text-[11px] text-[#737373]" title={event.createdAt?.toLocaleString()}>
								{relativeTime(event.createdAt)}
							</span>
						</div>
					{/each}
				{/if}
			</div>

		</div>

		<!-- Right Column -->
		<div class="flex flex-col gap-3">

			<!-- Active Onboarding -->
			<div class="rounded-2xl border border-black/[0.06] bg-white/65 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] backdrop-blur-xl">
				<div class="mb-3 flex items-center gap-2">
					<span class="h-[7px] w-[7px] shrink-0 rounded-full bg-[#0a0a0a]"></span>
					<span class="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#0a0a0a]">Active Onboarding</span>
				</div>
				<p class="font-['Cabinet_Grotesk'] text-[44px] font-extrabold leading-none tracking-[-0.04em] text-[#0a0a0a]">
					{data.onboardingCount}
				</p>
				<p class="mt-2 text-[12.5px] text-[#737373]">
					{data.onboardingCount === 1 ? 'employee' : 'employees'} currently being onboarded
				</p>
				<a href="/employees?status=onboarding"
					class="mt-4 flex h-8 w-full items-center justify-center rounded-lg border border-black/[0.08] bg-white/60 text-[12.5px] font-medium text-[#0a0a0a] no-underline transition-colors hover:bg-white/90">
					View Onboarding →
				</a>
			</div>

			<!-- Active Terminations -->
			<div class="rounded-2xl border border-[rgba(192,57,43,0.18)] bg-[rgba(192,57,43,0.03)] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)]">
				<div class="mb-3 flex items-center gap-2">
					<span class="h-[7px] w-[7px] shrink-0 rounded-full bg-[#c0392b]"></span>
					<span class="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#c0392b]">Active Terminations</span>
				</div>
				<p class="font-['Cabinet_Grotesk'] text-[44px] font-extrabold leading-none tracking-[-0.04em] text-[#0a0a0a]">
					{data.terminationCount}
				</p>
				<p class="mt-2 text-[12.5px] text-[#737373]">
					{data.terminationCount === 1 ? 'employee' : 'employees'} currently being offboarded
				</p>
				<a href="/employees?status=offboarding"
					class="mt-4 flex h-8 w-full items-center justify-center rounded-lg border border-[rgba(192,57,43,0.2)] bg-white/60 text-[12.5px] font-medium text-[#0a0a0a] no-underline transition-colors hover:bg-white/90">
					View Terminations →
				</a>
			</div>

		</div>
	</div>

</main>
