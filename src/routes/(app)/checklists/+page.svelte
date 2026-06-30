<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CHECKLIST_TYPES, CHECKLIST_TYPE_LABELS } from '$lib/constants';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAssignForm = $state(false);
	let showNewTemplate = $state(false);
	let selectedEmployeeId = $state('');
	let search = $state('');
	let filterStatus = $state<'all' | 'not-started' | 'in-progress' | 'complete'>('all');

	// Row click navigates to the template, but not when the click lands on an
	// interactive control (links/buttons).
	function templateRowClick(e: MouseEvent, id: string) {
		if ((e.target as HTMLElement).closest('input,button,a,[role="menu"]')) return;
		goto(`/checklists/templates/${id}`);
	}

	const inputClass = 'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
	const selectClass = inputClass + ' w-full';

	type Row = {
		assignment: typeof data.assignments[0];
		emp: typeof data.employees[0];
		template: typeof data.templates[0];
		items: typeof data.templateItems;
		done: Set<string>;
	};

	const doneByAssignment = $derived(() => {
		const map: Record<string, Set<string>> = {};
		for (const c of data.completions) {
			if (!map[c.assignmentId]) map[c.assignmentId] = new Set();
			map[c.assignmentId].add(c.templateItemId);
		}
		return map;
	});

	const allRows = $derived((): Row[] => {
		const empMap = Object.fromEntries(data.employees.map(e => [e.id, e]));
		const tmplMap = Object.fromEntries(data.templates.map(t => [t.id, t]));
		const doneMap = doneByAssignment();

		return data.assignments
			.map(a => {
				const emp = empMap[a.employeeId];
				const template = tmplMap[a.templateId];
				if (!emp || !template) return null;
				const items = data.templateItems.filter(i => i.templateId === a.templateId);
				return { assignment: a, emp, template, items, done: doneMap[a.id] ?? new Set() };
			})
			.filter((r): r is Row => r !== null)
			.sort((a, b) => {
				const empCmp = `${a.emp.firstName} ${a.emp.lastName}`.localeCompare(`${b.emp.firstName} ${b.emp.lastName}`);
				return empCmp !== 0 ? empCmp : a.template.name.localeCompare(b.template.name);
			});
	});

	const rows = $derived((): Row[] => {
		const q = search.trim().toLowerCase();
		return allRows().filter(r => {
			if (q) {
				const name = `${r.emp.firstName} ${r.emp.lastName}`.toLowerCase();
				if (!name.includes(q) && !r.template.name.toLowerCase().includes(q)) return false;
			}
			if (filterStatus !== 'all') {
				const tasks = r.items.filter(i => i.type === 'task');
				const n = tasks.filter(i => r.done.has(i.id)).length;
				if (filterStatus === 'complete' && !(tasks.length > 0 && n === tasks.length)) return false;
				if (filterStatus === 'in-progress' && !(n > 0 && n < tasks.length)) return false;
				if (filterStatus === 'not-started' && n !== 0) return false;
			}
			return true;
		});
	});

	const stats = $derived(() => {
		const all = allRows();
		const complete = all.filter(r => {
			const tasks = r.items.filter(i => i.type === 'task');
			return tasks.length > 0 && tasks.every(i => r.done.has(i.id));
		}).length;
		const inProgress = all.filter(r => {
			const tasks = r.items.filter(i => i.type === 'task');
			const n = tasks.filter(i => r.done.has(i.id)).length;
			return n > 0 && n < tasks.length;
		}).length;
		return { total: all.length, inProgress, complete };
	});

	const assignedTemplateIds = $derived(
		new Set(
			data.assignments
				.filter(a => a.employeeId === selectedEmployeeId)
				.map(a => a.templateId)
		)
	);

	// Termination checklists are managed on /terminations, not assigned here.
	const availableTemplates = $derived(
		data.templates.filter(t => !assignedTemplateIds.has(t.id) && t.checklistType !== 'termination')
	);

	function rowProgress(r: Row): { done: number; total: number } {
		const tasks = r.items.filter(i => i.type === 'task');
		return { done: tasks.filter(i => r.done.has(i.id)).length, total: tasks.length };
	}

	type UserGroup = { emp: Row['emp']; rows: Row[]; done: number; total: number };
	type TemplateGroup = { template: Row['template']; rows: Row[]; done: number; total: number };

	const byUser = $derived((): UserGroup[] => {
		const map = new Map<string, UserGroup>();
		for (const r of rows()) {
			let g = map.get(r.emp.id);
			if (!g) { g = { emp: r.emp, rows: [], done: 0, total: 0 }; map.set(r.emp.id, g); }
			const p = rowProgress(r);
			g.rows.push(r);
			g.done += p.done;
			g.total += p.total;
		}
		return [...map.values()].sort((a, b) =>
			`${a.emp.firstName} ${a.emp.lastName}`.localeCompare(`${b.emp.firstName} ${b.emp.lastName}`)
		);
	});

	const byTemplate = $derived((): TemplateGroup[] => {
		const map = new Map<string, TemplateGroup>();
		for (const r of rows()) {
			let g = map.get(r.template.id);
			if (!g) { g = { template: r.template, rows: [], done: 0, total: 0 }; map.set(r.template.id, g); }
			const p = rowProgress(r);
			g.rows.push(r);
			g.done += p.done;
			g.total += p.total;
		}
		return [...map.values()].sort((a, b) => a.template.name.localeCompare(b.template.name));
	});
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Checklists</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">Track task completion across your team.</p>
		</div>
		<Button variant="outline" size="sm" onclick={() => (showAssignForm = !showAssignForm)}>
			Assign checklist
		</Button>
	</header>

	<Tabs.Root value="assignments">
		<Tabs.List>
			<Tabs.Trigger value="assignments">Assignments</Tabs.Trigger>
			<Tabs.Trigger value="templates">Templates</Tabs.Trigger>
		</Tabs.List>

		<!-- ASSIGNMENTS TAB -->
		<Tabs.Content value="assignments">
			<div class="mt-4 flex flex-col gap-4">

				<!-- Stats -->
				<div class="grid grid-cols-3 gap-3">
					<Card.Root>
						<Card.Content class="px-5 py-4">
							<p class="text-[12px] text-muted-foreground">Total</p>
							<p class="font-heading text-[28px] font-extrabold leading-none tracking-[-0.04em] text-foreground">{stats().total}</p>
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Content class="px-5 py-4">
							<p class="text-[12px] text-muted-foreground">In Progress</p>
							<p class="font-heading text-[28px] font-extrabold leading-none tracking-[-0.04em] text-foreground">{stats().inProgress}</p>
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Content class="px-5 py-4">
							<p class="text-[12px] text-muted-foreground">Complete</p>
							<p class="font-heading text-[28px] font-extrabold leading-none tracking-[-0.04em] text-emerald-600">{stats().complete}</p>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Assign form -->
				{#if showAssignForm}
					<form
						method="POST"
						action="?/assign"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') { showAssignForm = false; selectedEmployeeId = ''; }
								await update();
							};
						}}
						class="flex items-end gap-2 rounded-lg border p-4"
					>
						<div class="flex flex-col gap-1.5">
							<label class="text-[12px] font-medium text-muted-foreground">Employee</label>
							<select name="employeeId" bind:value={selectedEmployeeId} class={selectClass} style="width:200px">
								<option value="" disabled>Select employee</option>
								{#each data.employees as emp (emp.id)}
									<option value={emp.id}>{emp.firstName} {emp.lastName}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[12px] font-medium text-muted-foreground">Template</label>
							<select name="templateId" class={selectClass} style="width:220px" disabled={!selectedEmployeeId || availableTemplates.length === 0}>
								<option value="" disabled selected>
									{!selectedEmployeeId ? 'Select employee first' : availableTemplates.length === 0 ? 'All templates assigned' : 'Select template'}
								</option>
								{#each availableTemplates as t (t.id)}
									<option value={t.id}>{t.name}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[12px] font-medium text-muted-foreground">Start Date <span class="font-normal opacity-60">optional</span></label>
							<DatePicker name="startDate" placeholder="Start date" class="w-[160px]" />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[12px] font-medium text-muted-foreground">Due Date <span class="font-normal opacity-60">optional</span></label>
							<DatePicker name="dueDate" placeholder="Due date" class="w-[160px]" />
						</div>
						<Button type="submit" size="sm">Assign</Button>
						<button
							type="button"
							onclick={() => (showAssignForm = false)}
							class="text-[13px] text-muted-foreground hover:text-foreground"
						>
							Cancel
						</button>
						{#if (form as any)?.assignError}
							<p class="text-[12px] text-destructive">{(form as any).assignError}</p>
						{/if}
					</form>
				{/if}

				<!-- Search + filter -->
				<div class="flex items-center gap-2">
					<input
						bind:value={search}
						placeholder="Search by employee or template…"
						class="{inputClass} w-[280px]"
					/>
					<select bind:value={filterStatus} class="{inputClass} w-[160px]">
						<option value="all">All statuses</option>
						<option value="not-started">Not started</option>
						<option value="in-progress">In progress</option>
						<option value="complete">Complete</option>
					</select>
					{#if search || filterStatus !== 'all'}
						<button
							type="button"
							onclick={() => { search = ''; filterStatus = 'all'; }}
							class="text-[13px] text-muted-foreground hover:text-foreground"
						>
							Clear
						</button>
					{/if}
				</div>

				<!-- Grouped views -->
				{#if allRows().length === 0}
					<div class="rounded-lg border border-dashed py-14 text-center">
						<p class="text-[13px] text-muted-foreground">No checklist assignments yet.</p>
						<p class="mt-1 text-[12px] text-muted-foreground">Create a template and assign it to an employee.</p>
					</div>
				{:else if rows().length === 0}
					<div class="rounded-lg border border-dashed py-10 text-center">
						<p class="text-[13px] text-muted-foreground">No assignments match your filters.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">

						<!-- By user -->
						<Card.Root class="overflow-hidden">
							<Card.Header class="px-5 py-3.5">
								<Card.Title class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">By User</Card.Title>
							</Card.Header>
							<Card.Content class="p-0">
								{#each byUser() as g (g.emp.id)}
									{@render groupRow(`/employees/${g.emp.id}?tab=checklist`, `${g.emp.firstName} ${g.emp.lastName}`, `${g.emp.firstName[0]}${g.emp.lastName[0]}`, g.rows.length, g.done, g.total)}
								{/each}
							</Card.Content>
						</Card.Root>

						<!-- By template -->
						<Card.Root class="overflow-hidden">
							<Card.Header class="px-5 py-3.5">
								<Card.Title class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">By Template</Card.Title>
							</Card.Header>
							<Card.Content class="p-0">
								{#each byTemplate() as g (g.template.id)}
									{@render groupRow(`/checklists/templates/${g.template.id}`, g.template.name, null, g.rows.length, g.done, g.total)}
								{/each}
							</Card.Content>
						</Card.Root>

					</div>
				{/if}

			</div>
		</Tabs.Content>

		<!-- TEMPLATES TAB -->
		<Tabs.Content value="templates">
			<div class="mt-4 flex flex-col gap-4">

				<div class="flex items-center justify-between">
					<p class="text-[13px] text-muted-foreground">
						{data.templates.length} {data.templates.length === 1 ? 'template' : 'templates'}
					</p>
					<Button size="sm" onclick={() => (showNewTemplate = !showNewTemplate)}>
						New template
					</Button>
				</div>

				{#if showNewTemplate}
					<form
						method="POST"
						action="?/addTemplate"
						use:enhance={({ formElement }) => {
							return async ({ result, update }) => {
								if (result.type === 'success') { formElement.reset(); showNewTemplate = false; }
								await update();
							};
						}}
						class="flex items-center gap-2 rounded-lg border p-4"
					>
						<input
							name="name"
							placeholder="Template name…"
							class="{inputClass} w-[260px]"
							required
							autofocus
						/>
						<select name="checklistType" class="{inputClass} w-[150px]">
							{#each CHECKLIST_TYPES as type (type)}
								<option value={type}>{CHECKLIST_TYPE_LABELS[type]}</option>
							{/each}
						</select>
						<Button type="submit" size="sm">Create</Button>
						<button type="button" onclick={() => (showNewTemplate = false)} class="text-[13px] text-muted-foreground hover:text-foreground">
							Cancel
						</button>
						{#if (form as any)?.addTemplateError}
							<p class="text-[12px] text-destructive">{(form as any).addTemplateError}</p>
						{/if}
					</form>
				{/if}

				<Card.Root class="overflow-hidden">
					<Card.Content class="p-0">
						{#if data.templates.length === 0}
							<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
								<p class="text-[14px] font-medium text-foreground">No templates yet</p>
								<p class="text-[13px] text-muted-foreground">Create a template to define a set of tasks for your team.</p>
								<Button size="sm" class="mt-1" onclick={() => (showNewTemplate = true)}>New template</Button>
							</div>
						{:else}
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
										<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Tasks</Table.Head>
										<Table.Head class="px-3 pr-5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Assignments</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.templates as template (template.id)}
										{@const itemCount = data.templateItems.filter(i => i.templateId === template.id).length}
										{@const assignmentCount = data.assignments.filter(a => a.templateId === template.id).length}
										<Table.Row onclick={(e) => templateRowClick(e, template.id)} class="group cursor-pointer">
											<Table.Cell class="py-3 pl-5 pr-3">
												<div class="flex items-center gap-2">
													<a href="/checklists/templates/{template.id}" class="text-[13.5px] font-medium text-foreground no-underline hover:underline">{template.name}</a>
													<Badge variant="secondary" class="text-[10.5px] font-medium uppercase tracking-[0.04em]">{CHECKLIST_TYPE_LABELS[template.checklistType as keyof typeof CHECKLIST_TYPE_LABELS] ?? template.checklistType}</Badge>
												</div>
												{#if template.description}
													<p class="mt-0.5 text-[12px] text-muted-foreground">{template.description}</p>
												{/if}
											</Table.Cell>
											<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{itemCount}</Table.Cell>
											<Table.Cell class="px-3 py-3 pr-5 text-[13.5px] text-muted-foreground">{assignmentCount}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{/if}
					</Card.Content>
				</Card.Root>

			</div>
		</Tabs.Content>
	</Tabs.Root>

</main>

{#snippet groupRow(href: string, label: string, initials: string | null, count: number, done: number, total: number)}
	{@const progress = total > 0 ? (done / total) * 100 : 0}
	{@const complete = total > 0 && done === total}
	<a
		{href}
		class="flex items-center gap-3 border-b border-border/60 px-5 py-3 no-underline transition-colors last:border-b-0 hover:bg-black/[0.02]"
	>
		{#if initials}
			<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
				{initials}
			</div>
		{/if}
		<span class="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{label}</span>
		<span class="shrink-0 text-[12px] text-muted-foreground">{count} {count === 1 ? 'checklist' : 'checklists'}</span>
		<div class="flex w-[120px] shrink-0 items-center gap-2.5">
			<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full transition-all duration-300 {complete ? 'bg-emerald-500' : 'bg-foreground'}"
					style="width: {progress}%"
				></div>
			</div>
			<span class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{done}/{total}</span>
		</div>
	</a>
{/snippet}
