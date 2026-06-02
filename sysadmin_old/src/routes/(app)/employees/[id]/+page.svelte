<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { relativeTime, formatDate } from '$lib/utils';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const emp = $derived(data.employee);

	type Status = 'active' | 'onboarding' | 'offboarding' | 'terminated';
	type DeviceType = 'laptop' | 'desktop' | 'monitor' | 'other';

	const statusMeta: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
		active:      { label: 'Active',      variant: 'default' },
		onboarding:  { label: 'Onboarding',  variant: 'secondary' },
		offboarding: { label: 'Offboarding', variant: 'outline' },
		terminated:  { label: 'Terminated',  variant: 'destructive' }
	};

	const deviceTypeLabel: Record<DeviceType, string> = {
		laptop: 'Laptop', desktop: 'Desktop', monitor: 'Monitor', other: 'Other'
	};

	const actionLabels: Record<string, string> = {
		'employee.created':        'Employee created',
		'employee.updated':        'Profile updated',
		'employee.status_changed': 'Status changed',
		'employee.terminated':     'Employee terminated',
		'workstation.assigned':    'Workstation assigned',
		'workstation.unassigned':  'Workstation unassigned',
		'order.created':           'Order created',
		'order.fulfilled':         'Order fulfilled'
	};

	let showAssign = $state(false);

	const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/employees" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Employees
	</a>

	<header class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-foreground font-heading text-[18px] font-extrabold text-background">
				{emp.firstName[0]}{emp.lastName[0]}
			</div>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-[24px] leading-none tracking-[-0.03em]">
						{emp.firstName} {emp.lastName}
					</h1>
					<Badge variant={statusMeta[emp.status as Status].variant} class="text-[11px]">
						{statusMeta[emp.status as Status].label}
					</Badge>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">{emp.role} · {emp.country}</p>
			</div>
		</div>
		<Button variant="outline" size="sm" href="/employees/{emp.id}/edit">Edit</Button>
	</header>

	<div class="grid grid-cols-[1fr_360px] items-start gap-4">

		<!-- Left column -->
		<div class="flex flex-col gap-4">

			<!-- Profile -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Profile</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-0">

					{#snippet row(label: string, value: string | null | undefined)}
						<div class="flex items-start justify-between gap-4 py-3 [&:not(:last-child)]:border-b">
							<span class="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
							<span class="text-right text-[13.5px] text-foreground">{value ?? '—'}</span>
						</div>
					{/snippet}

					{@render row('First Name', emp.firstName)}
					{@render row('Last Name', emp.lastName)}
					{@render row('Role', emp.role)}
					{@render row('Country', emp.country)}
					{@render row('Start Date', formatDate(emp.startDate))}
					{@render row('Microsoft Email', emp.microsoftEmail)}
					{@render row('Personal Email', emp.personalEmail)}
					{@render row('Temp Password', emp.tempPassword ? '••••••••••••' : null)}
				</Card.Content>
			</Card.Root>

			<!-- Workstations -->
			<Card.Root class="overflow-hidden">
				<Card.Header class="flex flex-row items-center justify-between pb-3">
					<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">Workstations</Card.Title>
					{#if data.assignable.length > 0 || showAssign}
						<button
							type="button"
							onclick={() => (showAssign = !showAssign)}
							class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							{showAssign ? 'Cancel' : '+ Assign'}
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
								<select name="workstationId" class={selectClass}>
									<option value="" disabled selected>Select workstation</option>
									{#if data.assignable.some(w => w.status === 'available')}
										<optgroup label="Available">
											{#each data.assignable.filter(w => w.status === 'available') as ws}
												<option value={ws.id}>{ws.serialNumber} — {ws.make} {ws.model}</option>
											{/each}
										</optgroup>
									{/if}
									{#if data.assignable.some(w => w.status === 'assigned')}
										<optgroup label="Reassign">
											{#each data.assignable.filter(w => w.status === 'assigned') as ws}
												<option value={ws.id}>{ws.serialNumber} — {ws.make} {ws.model} (with {ws.holderFirstName} {ws.holderLastName})</option>
											{/each}
										</optgroup>
									{/if}
								</select>
								<Button type="submit" size="sm" class="shrink-0">Assign</Button>
							</div>
							{#if form?.assignError}
								<p class="mt-2 text-[12px] text-destructive">{form.assignError}</p>
							{/if}
						</form>
					{/if}

					{#if data.workstations.length === 0}
						<div class="px-5 py-8 text-center">
							<p class="text-[13px] text-muted-foreground">No workstations assigned.</p>
						</div>
					{:else}
						{#each data.workstations as ws}
							<div class="flex items-center justify-between border-b border-border/60 px-5 py-[11px] last:border-b-0">
								<div class="flex flex-col gap-[3px]">
									<a
										href="/workstations/{ws.id}"
										class="font-mono text-[13px] font-medium text-foreground no-underline hover:underline"
									>
										{ws.serialNumber}
									</a>
									<span class="text-[12px] text-muted-foreground">
										{ws.make} {ws.model} · {deviceTypeLabel[ws.deviceType as DeviceType] ?? ws.deviceType}
									</span>
								</div>
								<form method="POST" action="?/unassign" use:enhance>
									<input type="hidden" name="workstationId" value={ws.id} />
									<button
										type="submit"
										class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-destructive"
									>
										Unassign
									</button>
								</form>
							</div>
						{/each}
					{/if}

				</Card.Content>
			</Card.Root>

		</div>

		<!-- Right column: Activity -->
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
							<div class="flex flex-1 min-w-0 flex-col gap-0.5">
								<span class="text-[13px] font-medium text-foreground">
									{actionLabels[event.action] ?? event.action}
								</span>
								{#if event.actorLabel}
									<span class="text-[11.5px] text-muted-foreground">by {event.actorLabel}</span>
								{/if}
							</div>
							<span
								class="shrink-0 text-[11px] text-muted-foreground"
								title={event.createdAt?.toLocaleString()}
							>
								{relativeTime(event.createdAt)}
							</span>
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

	</div>

</main>
