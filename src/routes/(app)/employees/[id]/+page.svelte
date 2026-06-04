<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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
		'workstation.unassigned':  'Workstation unassigned'
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
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-[18px] font-extrabold text-background">
				{emp.firstName[0]}{emp.lastName[0]}
			</div>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-[24px] leading-none tracking-[-0.03em]">{emp.firstName} {emp.lastName}</h1>
					<Badge variant={statusMeta[emp.status as Status]?.variant ?? 'outline'} class="text-[11px]">
						{statusMeta[emp.status as Status]?.label ?? emp.status}
					</Badge>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">{emp.role} · {emp.country}</p>
			</div>
		</div>
	</header>

	<Tabs.Root value="general">
		<Tabs.List>
			<Tabs.Trigger value="general">General</Tabs.Trigger>
			<Tabs.Trigger value="checklist">Checklist</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="general">
			<div class="mt-4 grid grid-cols-[1fr_360px] items-start gap-4">

				<div class="flex flex-col gap-4">

					<Card.Root>
						<Card.Header>
							<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Profile</Card.Title>
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

					<Card.Root class="overflow-hidden">
						<Card.Header class="flex flex-row items-center justify-between pb-3">
							<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Workstations</Card.Title>
							{#if data.assignable.length > 0 || showAssign}
								<button type="button" onclick={() => (showAssign = !showAssign)} class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
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
											<a href="/workstations/{ws.id}" class="font-mono text-[13px] font-medium text-foreground no-underline hover:underline">
												{ws.serialNumber}
											</a>
											<span class="text-[12px] text-muted-foreground">
												{ws.make} {ws.model} · {deviceTypeLabel[ws.deviceType as DeviceType] ?? ws.deviceType}
											</span>
										</div>
										<form method="POST" action="?/unassign" use:enhance>
											<input type="hidden" name="workstationId" value={ws.id} />
											<button type="submit" class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-destructive">
												Unassign
											</button>
										</form>
									</div>
								{/each}
							{/if}

						</Card.Content>
					</Card.Root>

				</div>

				<Card.Root class="overflow-hidden">
					<Card.Header class="flex flex-row items-center justify-between pb-3">
						<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Activity</Card.Title>
						<a href="/audit" class="text-[12px] font-medium text-muted-foreground no-underline hover:text-foreground">Full log →</a>
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
											{actionLabels[event.action] ?? event.action}
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
		</Tabs.Content>

		<Tabs.Content value="checklist">
			<div class="mt-4 flex flex-col gap-3">
				{#if data.assignments.length === 0}
					<div class="rounded-lg border border-dashed py-14 text-center">
						<p class="text-[13px] text-muted-foreground">No checklists assigned to this employee.</p>
						<a href="/checklists" class="mt-1 block text-[12px] text-muted-foreground underline hover:text-foreground">
							Manage checklists →
						</a>
					</div>
				{:else}
					{#each data.assignments as assignment (assignment.id)}
						{@const template = data.templates.find(t => t.id === assignment.templateId)}
						{@const items = data.templateItems.filter(i => i.templateId === assignment.templateId)}
						{@const tasks = items.filter(i => i.type === 'task')}
						{@const doneIds = new Set(data.completions.filter(c => c.assignmentId === assignment.id).map(c => c.templateItemId))}
						{@const doneCount = tasks.filter(i => doneIds.has(i.id)).length}
						{@const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}
						{@const allDone = tasks.length > 0 && doneCount === tasks.length}

						<Card.Root class={allDone ? 'border-emerald-200' : ''}>
							<Card.Header class="pb-3">
								<div class="flex items-center justify-between">
									<div>
										<Card.Title class="text-[14px] font-semibold tracking-[-0.01em]">
											{template?.name ?? 'Unknown template'}
										</Card.Title>
										<p class="mt-0.5 text-[12px] text-muted-foreground">
											Assigned {relativeTime(assignment.assignedAt)}
										</p>
									</div>
									<a href="/checklists/{assignment.id}" class="text-[12px] text-muted-foreground no-underline hover:text-foreground">
										Open →
									</a>
								</div>
							</Card.Header>
							<Card.Content class="pt-0">
								<!-- Progress -->
								<div class="mb-3 flex items-center gap-3">
									<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full transition-all duration-300 {allDone ? 'bg-emerald-500' : 'bg-foreground'}"
											style="width: {progress}%"
										></div>
									</div>
									<span class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{doneCount}/{tasks.length}</span>
								</div>
								<!-- Tasks -->
								<div class="flex flex-col">
									{#each items as item (item.id)}
										{#if item.type === 'section'}
											<div class="mb-0.5 mt-2.5 first:mt-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-1">
												{item.label}
											</div>
										{:else}
											{@const done = doneIds.has(item.id)}
											<form method="POST" action="?/toggleTask" use:enhance>
												<input type="hidden" name="assignmentId" value={assignment.id} />
												<input type="hidden" name="templateItemId" value={item.id} />
												<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
												<button
													type="submit"
													class="flex w-full items-center gap-2.5 rounded-md px-1 py-[5px] text-left transition-colors hover:bg-muted/50"
												>
													<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition-colors
														{done ? 'border-foreground bg-foreground' : 'border-border bg-background'}">
														{#if done}
															<svg class="h-2.5 w-2.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
																<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
															</svg>
														{/if}
													</span>
													<span class="text-[13px] {done ? 'text-muted-foreground line-through' : 'text-foreground'}">
														{item.label}
													</span>
												</button>
											</form>
										{/if}
									{/each}
									{#if items.length === 0}
										<p class="px-1 text-[12px] italic text-muted-foreground">No tasks defined.</p>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				{/if}
			</div>
		</Tabs.Content>
	</Tabs.Root>

</main>
