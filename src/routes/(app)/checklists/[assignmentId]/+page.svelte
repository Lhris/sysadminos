<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { relativeTime, formatDate } from '$lib/utils';
	import RunAutomationDialog from '$lib/components/RunAutomationDialog.svelte';
	import type { AutomationField } from '$lib/automation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Automation run dialog ──────────────────────────────────────────
	type RunAutomation = { id: string; name: string; description: string | null; url: string; fields: AutomationField[] };

	let runOpen = $state(false);
	let runItemId = $state('');
	let runAuto = $state<RunAutomation | null>(null);

	function openRun(itemId: string, automationId: string) {
		const auto = (data.automations as Record<string, RunAutomation>)[automationId];
		if (!auto) return;
		runItemId = itemId;
		runAuto = auto;
		runOpen = true;
	}

	type Status = 'active' | 'onboarding' | 'offboarding' | 'terminated';
	const statusMeta: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
		active:      { label: 'Active',      variant: 'default' },
		onboarding:  { label: 'Onboarding',  variant: 'secondary' },
		offboarding: { label: 'Offboarding', variant: 'outline' },
		terminated:  { label: 'Terminated',  variant: 'destructive' }
	};

	const taskItems = $derived(data.items.filter(i => i.type === 'task'));
	const doneIds = $derived(new Set(data.completions.map(c => c.templateItemId)));
	const doneCount = $derived(taskItems.filter(i => doneIds.has(i.id)).length);
	const progress = $derived(taskItems.length > 0 ? (doneCount / taskItems.length) * 100 : 0);

	let editingDates = $state(false);

	function toDateInput(s: string | null | undefined) { return s ? s.slice(0, 10) : ''; }


</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/checklists" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Checklists
	</a>

	<header class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-4">
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-[18px] font-extrabold text-background">
				{data.employee.firstName[0]}{data.employee.lastName[0]}
			</div>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-[24px] leading-none tracking-[-0.03em]">{data.employee.firstName} {data.employee.lastName}</h1>
					<Badge variant={statusMeta[data.employee.status as Status]?.variant ?? 'outline'} class="text-[11px]">
						{statusMeta[data.employee.status as Status]?.label ?? data.employee.status}
					</Badge>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">{data.template.name}</p>
			</div>
		</div>
		<form method="POST" action="?/unassign" use:enhance class="shrink-0 pt-1">
			<button type="submit" class="text-[12px] font-medium text-muted-foreground transition-colors hover:text-destructive">
				Remove assignment
			</button>
		</form>
	</header>

	<!-- Progress -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<span class="text-[13px] font-medium text-foreground">{doneCount}/{taskItems.length} tasks complete</span>
			<span class="text-[13px] text-muted-foreground">{Math.round(progress)}%</span>
		</div>
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full rounded-full bg-foreground transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	<!-- Dates -->
	<div class="flex items-center gap-6">
		{#if !editingDates}
			<div class="flex items-center gap-6 text-[13px] text-muted-foreground">
				<span>Start: <span class="text-foreground">{data.assignment.startDate ? formatDate(data.assignment.startDate) : '—'}</span></span>
				<span>Due: <span class="{data.assignment.dueDate && new Date(data.assignment.dueDate) < new Date() ? 'text-destructive font-medium' : 'text-foreground'}">{data.assignment.dueDate ? formatDate(data.assignment.dueDate) : '—'}</span></span>
			</div>
			<button type="button" onclick={() => (editingDates = true)} class="text-[12px] text-muted-foreground hover:text-foreground">
				Edit dates
			</button>
		{:else}
			<form
				method="POST"
				action="?/updateDates"
				use:enhance={() => async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') editingDates = false;
				}}
				class="flex items-end gap-3"
			>
				<div class="flex flex-col gap-1">
					<label class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Start Date</label>
					<DatePicker name="startDate" value={toDateInput(data.assignment.startDate)} placeholder="Start date" class="w-[160px]" />
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Due Date</label>
					<DatePicker name="dueDate" value={toDateInput(data.assignment.dueDate)} placeholder="Due date" class="w-[160px]" />
				</div>
				<button type="submit" class="h-9 rounded-md bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-80">Save</button>
				<button type="button" onclick={() => (editingDates = false)} class="text-[13px] text-muted-foreground hover:text-foreground">Cancel</button>
			</form>
		{/if}
	</div>

	<!-- Task table -->
	{#if data.items.length === 0}
		<div class="rounded-lg border border-dashed py-14 text-center">
			<p class="text-[13px] text-muted-foreground">No tasks in this template.</p>
			<a href="/checklists/templates/{data.template.id}" class="mt-1 block text-[12px] text-muted-foreground underline hover:text-foreground">
				Add tasks to the template →
			</a>
		</div>
	{:else}
		<Card.Root class="overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-10 pl-5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"></Table.Head>
						<Table.Head class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Task</Table.Head>
						<Table.Head class="text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground pr-5">Completed</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.items as item (item.id)}
						{#if item.type === 'section'}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={3} class="bg-muted/40 py-2 pl-5 pr-5">
									<span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</span>
								</Table.Cell>
							</Table.Row>
						{:else}
							{@const done = doneIds.has(item.id)}
							{@const completion = data.completions.find(c => c.templateItemId === item.id)}
							<Table.Row class="group">
								<Table.Cell class="w-10 pl-5 pr-3 py-3.5">
									<form method="POST" action="?/toggle" use:enhance>
										<input type="hidden" name="templateItemId" value={item.id} />
										<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
										<button type="submit"
											class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors
												{done
													? 'border-foreground bg-foreground hover:border-destructive hover:bg-destructive'
													: 'border-border bg-background hover:border-foreground/50'}">
											{#if done}
												<svg class="h-3 w-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</button>
									</form>
								</Table.Cell>
								<Table.Cell class="py-3.5">
									<div class="flex items-center gap-1.5">
										<span class="text-[13.5px] {done ? 'text-muted-foreground line-through' : 'text-foreground'}">
											{item.label}
										</span>
										{#if item.videoUrl}
											<a href={item.videoUrl} target="_blank" rel="noopener noreferrer" title="Reference video"
												class="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground">
												<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
													<circle cx="12" cy="12" r="10" />
													<polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
												</svg>
											</a>
										{/if}
										{#if item.docUrl}
											<a href={item.docUrl} target="_blank" rel="noopener noreferrer" title="Documentation"
												class="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground">
												<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
													<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
												</svg>
											</a>
										{/if}
										{#if item.automationId}
											<button type="button" title="Run automation" onclick={() => openRun(item.id, item.automationId!)}
												class="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground">
												<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
													<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
											</button>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="py-3.5 pr-5 text-right">
									{#if done && completion}
										<div class="flex flex-col items-end gap-0.5">
											{#if completion.completedByLabel}
												<span class="text-[13px] text-foreground">{completion.completedByLabel}</span>
											{/if}
											{#if completion.completedAt}
												<span class="text-[11.5px] text-muted-foreground">{relativeTime(completion.completedAt)}</span>
											{/if}
										</div>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/if}
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{/if}

</main>

<!-- Run automation dialog -->
<RunAutomationDialog
	bind:open={runOpen}
	automation={runAuto}
	profile={data.employee}
	action="?/runAutomation"
	hidden={{ templateItemId: runItemId }}
/>
