<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { relativeTime } from '$lib/utils';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAssignForm = $state(false);
	let showNewTemplate = $state(false);
	let selectedEmployeeId = $state('');
	let search = $state('');
	let filterStatus = $state<'all' | 'not-started' | 'in-progress' | 'complete'>('all');
	let expanded = $state(new Set<string>());

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

	const availableTemplates = $derived(
		data.templates.filter(t => !assignedTemplateIds.has(t.id))
	);

	function toggleExpand(id: string) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}
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

				<!-- List -->
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
					<div class="rounded-lg border overflow-hidden">
						{#each rows() as row (row.assignment.id)}
							{@const tasks = row.items.filter(i => i.type === 'task')}
							{@const doneCount = tasks.filter(i => row.done.has(i.id)).length}
							{@const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}
							{@const isExpanded = expanded.has(row.assignment.id)}

							<!-- Row -->
							<div
								role="button"
								tabindex="0"
								onclick={() => toggleExpand(row.assignment.id)}
								onkeydown={(e) => e.key === 'Enter' && toggleExpand(row.assignment.id)}
								class="flex w-full cursor-pointer items-center gap-4 border-b border-border/60 px-5 py-3 transition-colors hover:bg-accent {isExpanded ? 'bg-accent/50' : ''} {!isExpanded && rows().indexOf(row) === rows().length - 1 ? 'border-b-0' : ''}"
							>
								<!-- Chevron -->
								<svg
									class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform {isExpanded ? 'rotate-90' : ''}"
									fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>

								<!-- Avatar + name -->
								<div class="flex w-[180px] shrink-0 items-center gap-2.5">
									<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
										{row.emp.firstName[0]}{row.emp.lastName[0]}
									</div>
									<a
										href="/checklists/{row.assignment.id}"
										onclick={(e) => e.stopPropagation()}
										class="truncate text-[13px] font-medium text-foreground no-underline hover:underline"
									>
										{row.emp.firstName} {row.emp.lastName}
									</a>
								</div>

								<!-- Template name -->
								<span class="w-[200px] shrink-0 truncate text-[13px] text-muted-foreground">
									{row.template.name}
								</span>

								<!-- Assigned date -->
								<span class="w-[100px] shrink-0 text-right text-[12px] text-muted-foreground" title={row.assignment.assignedAt?.toLocaleString()}>
									{relativeTime(row.assignment.assignedAt)}
								</span>

								<!-- Progress bar -->
								<div class="flex w-[160px] shrink-0 items-center gap-3">
									<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full transition-all duration-300 {doneCount === tasks.length && tasks.length > 0 ? 'bg-emerald-500' : 'bg-foreground'}"
											style="width: {progress}%"
										></div>
									</div>
									<span class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{doneCount}/{tasks.length}</span>
								</div>
							</div>

							<!-- Expanded tasks -->
							{#if isExpanded}
								<div class="border-b border-border/60 bg-muted/20 px-5 py-3 {rows().indexOf(row) === rows().length - 1 ? 'border-b-0' : ''}">
									{#if row.items.length === 0}
										<p class="text-[12px] italic text-muted-foreground">No tasks defined in this template.</p>
									{:else}
										<div class="flex flex-col gap-0.5 pl-[52px]">
											{#each row.items as item (item.id)}
												{#if item.type === 'section'}
													<div class="mb-0.5 mt-2.5 first:mt-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
														{item.label}
													</div>
												{:else}
													{@const done = row.done.has(item.id)}
													<form method="POST" action="?/toggle" use:enhance>
														<input type="hidden" name="assignmentId" value={row.assignment.id} />
														<input type="hidden" name="templateItemId" value={item.id} />
														<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
														<button
															type="submit"
															class="flex w-full items-center gap-2.5 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-muted/60"
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
										</div>
										<div class="mt-3 pl-[52px]">
											<a href="/checklists/{row.assignment.id}" class="text-[12px] text-muted-foreground no-underline hover:text-foreground">
												Open full view →
											</a>
										</div>
									{/if}
								</div>
							{/if}
						{/each}
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
										<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Assignments</Table.Head>
										<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.templates as template (template.id)}
										{@const itemCount = data.templateItems.filter(i => i.templateId === template.id).length}
										{@const assignmentCount = data.assignments.filter(a => a.templateId === template.id).length}
										<Table.Row class="group">
											<Table.Cell class="py-3 pl-5 pr-3">
												<span class="text-[13.5px] font-medium text-foreground">{template.name}</span>
												{#if template.description}
													<p class="mt-0.5 text-[12px] text-muted-foreground">{template.description}</p>
												{/if}
											</Table.Cell>
											<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{itemCount}</Table.Cell>
											<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{assignmentCount}</Table.Cell>
											<Table.Cell class="py-3 pl-3 pr-5 text-right">
												<Button variant="ghost" size="sm" href="/checklists/templates/{template.id}" class="h-7 px-2 text-[12px] opacity-0 transition-opacity group-hover:opacity-100">
													Manage →
												</Button>
											</Table.Cell>
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
