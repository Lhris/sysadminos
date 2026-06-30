<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Select from '$lib/components/ui/select';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { relativeTime, formatDate } from '$lib/utils';
	import { visibleChecklistTypes, type ChecklistType } from '$lib/constants';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const emp = $derived(data.employee);

	// Onboarding/general checklists hide once an employee is being terminated, and
	// vice-versa — so a quick onboard→terminate doesn't leave a stale onboarding list.
	const visibleAssignments = $derived(
		data.assignments.filter((a) => {
			const t = data.templates.find((t) => t.id === a.templateId);
			return t ? visibleChecklistTypes(emp.status).includes(t.checklistType as ChecklistType) : true;
		})
	);

	type Status = 'offer_pending' | 'active' | 'onboarding' | 'offboarding' | 'terminated';
	type DeviceType = 'laptop' | 'desktop' | 'monitor' | 'other';

	const statusMeta: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
		offer_pending: { label: 'Offer Pending', variant: 'outline' },
		active:        { label: 'Active',        variant: 'default' },
		onboarding:    { label: 'Onboarding',    variant: 'secondary' },
		offboarding:   { label: 'Offboarding',   variant: 'outline' },
		terminated:    { label: 'Terminated',    variant: 'destructive' }
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

	const roles     = $derived(data.roles);
	const countries = ['United States', 'Philippines'];
	const statuses  = [
		{ value: 'offer_pending', label: 'Offer Pending' },
		{ value: 'onboarding',    label: 'Onboarding' },
		{ value: 'active',        label: 'Active' },
		{ value: 'offboarding',   label: 'Offboarding' },
		{ value: 'terminated',    label: 'Terminated' }
	];

	function statusLabel(v: string) { return statuses.find(s => s.value === v)?.label ?? v; }

	// Edit sheet state
	let sheetOpen   = $state(false);
	let editRole    = $state('');
	let editCountry = $state('');
	let editStatus  = $state('');

	function openEdit() {
		editRole    = emp.role;
		editCountry = emp.country;
		editStatus  = emp.status;
		sheetOpen   = true;
	}

	// Extract YYYY-MM-DD from stored PST timestamp for the date input
	function toDateInput(dateStr: string | null | undefined): string {
		if (!dateStr) return '';
		return dateStr.slice(0, 10);
	}

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

	{#if emp.status === 'terminated' || emp.status === 'pending_termination'}
		<a href="/terminations/{emp.id}" class="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-[13px] text-destructive no-underline transition-colors hover:bg-destructive/10">
			<span>This employee is being terminated. Track platform removals and termination checklists on the terminations page.</span>
			<span class="font-medium">Open termination →</span>
		</a>
	{/if}

	<div class="grid grid-cols-[1fr_360px] items-start gap-4">

		<!-- Checklist (main) -->
		<div class="flex flex-col gap-3">
			{#if visibleAssignments.length === 0}
				<div class="rounded-lg border border-dashed py-14 text-center">
					<p class="text-[13px] text-muted-foreground">No checklists assigned to this employee.</p>
					<a href="/checklists" class="mt-1 block text-[12px] text-muted-foreground underline hover:text-foreground">
						Manage checklists →
					</a>
				</div>
			{:else}
				{#each visibleAssignments as assignment (assignment.id)}
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
										<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
											<span class="text-[12px] text-muted-foreground">Assigned {relativeTime(assignment.assignedAt)}</span>
											{#if assignment.startDate}
												<span class="text-[12px] text-muted-foreground">Start: {formatDate(assignment.startDate)}</span>
											{/if}
											{#if assignment.dueDate}
												{@const overdue = !allDone && new Date(assignment.dueDate) < new Date()}
												<span class="text-[12px] {overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}">
													Due: {formatDate(assignment.dueDate)}
												</span>
											{/if}
										</div>
									</div>
									<a href="/checklists/{assignment.id}" class="text-[12px] text-muted-foreground no-underline hover:text-foreground">
										Open →
									</a>
								</div>
							</Card.Header>
							<Card.Content class="pt-0">
								<div class="mb-3 flex items-center gap-3">
									<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full transition-all duration-300 {allDone ? 'bg-emerald-500' : 'bg-foreground'}"
											style="width: {progress}%"
										></div>
									</div>
									<span class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{doneCount}/{tasks.length}</span>
								</div>
								<div class="flex flex-col">
									{#each items as item (item.id)}
										{#if item.type === 'section'}
											<div class="mb-0.5 mt-2.5 first:mt-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-1">
												{item.label}
											</div>
										{:else}
											{@const done = doneIds.has(item.id)}
											<div class="flex items-center gap-2.5 rounded-md px-1 py-[5px]">
												<form method="POST" action="?/toggleTask" use:enhance class="shrink-0">
													<input type="hidden" name="assignmentId" value={assignment.id} />
													<input type="hidden" name="templateItemId" value={item.id} />
													<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
													<button type="submit"
														class="flex h-4 w-4 items-center justify-center rounded border-[1.5px] transition-colors
															{done ? 'border-foreground bg-foreground' : 'border-border bg-background hover:border-foreground/50'}">
														{#if done}
															<svg class="h-2.5 w-2.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
																<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
															</svg>
														{/if}
													</button>
												</form>
												<span class="text-[13px] {done ? 'text-muted-foreground line-through' : 'text-foreground'}">
													{item.label}
												</span>
												{#if item.videoUrl}
													<a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
														title="View reference video"
														class="shrink-0 text-muted-foreground/40 transition-colors hover:text-foreground">
														<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
															<circle cx="12" cy="12" r="10" />
															<path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
														</svg>
													</a>
												{/if}
											</div>
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

		<!-- Sidebar -->
		<div class="flex flex-col gap-4">

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

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-3">
					<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Profile</Card.Title>
					<button type="button" onclick={openEdit} class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
						Edit
					</button>
				</Card.Header>
				<Card.Content class="flex flex-col gap-0 p-0">

					{#snippet row(label: string, value: string | null | undefined)}
						<div class="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-3 last:border-b-0">
							<span class="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
							<span class="text-right text-[13.5px] text-foreground">{value ?? '—'}</span>
						</div>
					{/snippet}
					{@render row('First Name', emp.firstName)}
					{@render row('Last Name', emp.lastName)}
					{@render row('Role', emp.role)}
					{@render row('Country', emp.country)}
					{@render row('Address', emp.address)}
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

	</div>

</main>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-md">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">Edit Employee</Sheet.Title>
			<Sheet.Description class="text-xs">{emp.firstName} {emp.lastName}</Sheet.Description>
		</Sheet.Header>

		<form
			method="POST"
			action="?/updateEmployee"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') sheetOpen = false;
			}}
			class="flex flex-1 flex-col overflow-hidden"
		>
			<div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">First Name</Label>
						<Input name="firstName" value={emp.firstName} class={form?.editErrors?.firstName ? 'border-destructive' : ''} />
						{#if form?.editErrors?.firstName}<p class="text-[12px] text-destructive">{form.editErrors.firstName}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Last Name</Label>
						<Input name="lastName" value={emp.lastName} class={form?.editErrors?.lastName ? 'border-destructive' : ''} />
						{#if form?.editErrors?.lastName}<p class="text-[12px] text-destructive">{form.editErrors.lastName}</p>{/if}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Role</Label>
						<Select.Root type="single" value={editRole} onValueChange={(v) => (editRole = v)}>
							<Select.Trigger class="w-full">{editRole || 'Select role'}</Select.Trigger>
							<Select.Content>
								{#each roles as r}
									<Select.Item value={r} label={r}>{r}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="role" value={editRole} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Country</Label>
						<Select.Root type="single" value={editCountry} onValueChange={(v) => (editCountry = v)}>
							<Select.Trigger class="w-full">{editCountry || 'Select country'}</Select.Trigger>
							<Select.Content>
								{#each countries as c}
									<Select.Item value={c} label={c}>{c}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="country" value={editCountry} />
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Address <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="address" placeholder="123 Main St, City, State" value={emp.address ?? ''} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Start Date</Label>
						<DatePicker name="startDate" value={toDateInput(emp.startDate)} class={form?.editErrors?.startDate ? 'border-destructive' : ''} />
						{#if form?.editErrors?.startDate}<p class="text-[12px] text-destructive">{form.editErrors.startDate}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Status</Label>
						<Select.Root type="single" value={editStatus} onValueChange={(v) => (editStatus = v)}>
							<Select.Trigger class="w-full">{statusLabel(editStatus)}</Select.Trigger>
							<Select.Content>
								{#each statuses as s}
									<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="status" value={editStatus} />
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Microsoft Email</Label>
					<Input name="microsoftEmail" type="email" value={emp.microsoftEmail} class={form?.editErrors?.microsoftEmail ? 'border-destructive' : ''} />
					{#if form?.editErrors?.microsoftEmail}<p class="text-[12px] text-destructive">{form.editErrors.microsoftEmail}</p>{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Personal Email <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="personalEmail" type="email" value={emp.personalEmail ?? ''} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label class="text-[13px]">Temp Password <span class="text-[11px] font-normal text-muted-foreground">Optional</span></Label>
					<Input name="tempPassword" type="text" value={emp.tempPassword ?? ''} class="font-mono text-[13px]" />
				</div>

			</div>

			<div class="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
				<Sheet.Close>
					<Button type="button" variant="outline" size="sm">Cancel</Button>
				</Sheet.Close>
				<Button type="submit" size="sm">Save changes</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
