<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Switch } from '$lib/components/ui/switch';
	import { createSvelteTable } from '$lib/components/ui/data-table';
	import { createColumnHelper, getCoreRowModel } from '@tanstack/table-core';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Pencil, Check, ChevronUp, ChevronDown } from '@lucide/svelte';

	type Assignment = { id: string; employeeId: string; firstName: string; lastName: string };
	type Item = { id: string; label: string; type: string };
	type Completion = { assignmentId: string; templateItemId: string };

	let { assignments, items, completions }: {
		assignments: Assignment[];
		items: Item[];
		completions: Completion[];
	} = $props();

	let hideCompleted = $state(true);
	let editingItemId = $state<string | null>(null);
	let editingItemLabel = $state('');
	let confirmDeleteId = $state<string | null>(null);
	let deleteFormRef = $state<HTMLFormElement | null>(null);

	let localItems = $state(items.map(i => ({ ...i })));
	$effect(() => { localItems = items.map(i => ({ ...i })); });

	function move(index: number, dir: -1 | 1) {
		const next = index + dir;
		if (next < 0 || next >= localItems.length) return;
		const arr = [...localItems];
		[arr[index], arr[next]] = [arr[next], arr[index]];
		localItems = arr;
		const body = new FormData();
		body.append('ids', JSON.stringify(arr.map(i => i.id)));
		fetch('?/reorderItems', { method: 'POST', body });
	}

	const doneSet = $derived(
		new Set(completions.map(c => `${c.assignmentId}:${c.templateItemId}`))
	);
	function isDone(assignmentId: string, itemId: string) {
		return doneSet.has(`${assignmentId}:${itemId}`);
	}
	function doneCount(assignmentId: string) {
		return items.filter(i => i.type === 'task' && isDone(assignmentId, i.id)).length;
	}
	const taskItems = $derived(localItems.filter(i => i.type === 'task'));
	const visibleAssignments = $derived(
		hideCompleted
			? assignments.filter(a => doneCount(a.id) < taskItems.length)
			: assignments
	);

	type TaskRow = { id: string; label: string; type: string };
	const columnHelper = createColumnHelper<TaskRow>();
	const taskCol = columnHelper.accessor('label', { id: 'task', header: 'Task' });
	const userCols = $derived(
		visibleAssignments.map(a => columnHelper.display({ id: `u_${a.id}`, size: 90 }))
	);
	const columns = $derived([taskCol, ...userCols]);
	const tableData = $derived<TaskRow[]>(localItems.map(i => ({ id: i.id, label: i.label, type: i.type })));
	const table = createSvelteTable({
		get data() { return tableData; },
		get columns() { return columns; },
		getCoreRowModel: getCoreRowModel(),
	});
</script>

{#if assignments.length === 0 && localItems.length === 0}
	<div class="rounded-lg border border-dashed py-14 text-center">
		<p class="text-[13px] text-muted-foreground">No tasks or users yet.</p>
	</div>
{:else if visibleAssignments.length === 0 && hideCompleted && assignments.length > 0}
	<div class="rounded-lg border border-dashed py-10 text-center">
		<p class="text-[13px] text-muted-foreground">All assigned users have completed this checklist.</p>
		<button type="button" onclick={() => (hideCompleted = false)} class="mt-1 text-[12px] text-muted-foreground underline hover:text-foreground">Show all</button>
	</div>
{:else}
	<div class="rounded-lg border overflow-x-auto">
		<table class="min-w-full text-left">
			<thead>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<tr class="border-b bg-muted/40">
						{#each headerGroup.headers as header (header.id)}
							{#if header.column.id === 'task'}
								<th class="sticky left-0 z-10 min-w-[200px] w-[26vw] bg-muted py-2.5 pl-10 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground [box-shadow:4px_0_0_0_hsl(var(--muted))]">
									Task
									<span class="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/60">({taskItems.length})</span>
								</th>
							{:else}
								{@const a = visibleAssignments.find(a => `u_${a.id}` === header.column.id)!}
								<th class="px-3 py-2.5 text-center text-[11px] font-medium tracking-[0.06em] text-muted-foreground" style="min-width:90px">
									<div class="flex flex-col items-center gap-1">
										<div class="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
											{a.firstName[0]}{a.lastName[0]}
										</div>
										<a href={resolve("/employees/{a.employeeId}")}
											class="normal-case text-center text-[11px] leading-tight text-foreground/80 no-underline hover:underline">
											{a.firstName} {a.lastName}
										</a>
										<span class="text-[10px] font-normal normal-case text-muted-foreground/60">
											{doneCount(a.id)}/{taskItems.length}
										</span>
									</div>
								</th>
							{/if}
						{/each}
					</tr>
				{/each}
			</thead>
			<tbody>
				{#each localItems as item, index (item.id)}
					<tr class="group border-b border-border/60 last:border-b-0 transition-colors {item.type === 'section' ? '' : 'hover:bg-accent/30'}">
						{#if item.type === 'section'}
							<td class="sticky left-0 z-10 bg-muted py-2 pl-3 pr-3 [box-shadow:4px_0_0_0_hsl(var(--muted))]" colspan={columns.length}>
								<div class="flex items-center gap-2">
									<div class="flex flex-col">
										<button type="button" onclick={() => move(index, -1)} disabled={index === 0}
											class="text-muted-foreground/30 transition-colors hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
											<ChevronUp class="h-3.5 w-3.5" />
										</button>
										<button type="button" onclick={() => move(index, 1)} disabled={index === localItems.length - 1}
											class="text-muted-foreground/30 transition-colors hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
											<ChevronDown class="h-3.5 w-3.5" />
										</button>
									</div>
									{#if editingItemId === item.id}
										<form method="POST" action="?/updateItem"
											use:enhance={() => ({ async update(r) { editingItemId = null; await r.update(); } })}
											class="flex flex-1 items-center gap-1.5">
											<input type="hidden" name="id" value={item.id} />
											<input name="label" bind:value={editingItemLabel} autofocus
												onkeydown={(e) => {
													if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).closest('form')?.requestSubmit(); }
													if (e.key === 'Escape') editingItemId = null;
												}}
												class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground focus:outline-none"
											/>
											<button type="submit" class="shrink-0 text-muted-foreground hover:text-foreground">
												<Check class="h-3.5 w-3.5" />
											</button>
										</form>
									{:else}
										<div class="flex items-center gap-2">
											<span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</span>
											<div class="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
												<button type="button" onclick={() => { editingItemId = item.id; editingItemLabel = item.label; }}
													class="text-muted-foreground hover:text-foreground">
													<Pencil class="h-3 w-3" />
												</button>
												<button type="button" onclick={() => (confirmDeleteId = item.id)}
													class="text-[11px] text-muted-foreground hover:text-destructive">✕</button>
											</div>
										</div>
									{/if}
								</div>
							</td>
						{:else}
							<td class="sticky left-0 z-10 min-w-[200px] w-[26vw] bg-background py-3 pl-3 pr-3 group-hover:bg-accent/30 [box-shadow:4px_0_0_0_hsl(var(--background))] group-hover:[box-shadow:4px_0_0_0_hsl(var(--accent))]">
								{#if editingItemId === item.id}
									<div class="flex items-center gap-2">
										<div class="flex flex-col opacity-30">
											<ChevronUp class="h-3.5 w-3.5 text-muted-foreground" />
											<ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										<form method="POST" action="?/updateItem"
											use:enhance={() => ({ async update(r) { editingItemId = null; await r.update(); } })}
											class="flex flex-1 items-center gap-1.5">
											<input type="hidden" name="id" value={item.id} />
											<input name="label" bind:value={editingItemLabel} autofocus
												onkeydown={(e) => {
													if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).closest('form')?.requestSubmit(); }
													if (e.key === 'Escape') editingItemId = null;
												}}
												class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-foreground focus:outline-none"
											/>
											<button type="submit" class="shrink-0 text-muted-foreground hover:text-foreground">
												<Check class="h-3.5 w-3.5" />
											</button>
										</form>
									</div>
								{:else}
									<div class="flex items-center gap-2">
										<div class="flex flex-col">
											<button type="button" onclick={() => move(index, -1)} disabled={index === 0}
												class="text-muted-foreground/30 transition-colors hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
												<ChevronUp class="h-3.5 w-3.5" />
											</button>
											<button type="button" onclick={() => move(index, 1)} disabled={index === localItems.length - 1}
												class="text-muted-foreground/30 transition-colors hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
												<ChevronDown class="h-3.5 w-3.5" />
											</button>
										</div>
										<div class="flex flex-1 items-center justify-between gap-2">
											<span class="break-words text-[13.5px] text-foreground">{item.label}</span>
											<div class="flex shrink-0 items-center gap-2">
												<span class="text-[11.5px] text-muted-foreground/50">
													{completions.filter(c => c.templateItemId === item.id).length}/{assignments.length}
												</span>
												<div class="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
													<button type="button" onclick={() => { editingItemId = item.id; editingItemLabel = item.label; }}
														class="text-muted-foreground hover:text-foreground">
														<Pencil class="h-3 w-3" />
													</button>
													<button type="button" onclick={() => (confirmDeleteId = item.id)}
														class="text-[11px] text-muted-foreground hover:text-destructive">✕</button>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</td>
							{#each visibleAssignments as a (a.id)}
								{@const done = isDone(a.id, item.id)}
								<td class="px-3 py-3 text-center">
									<form method="POST" action="?/toggle" use:enhance class="flex justify-center">
										<input type="hidden" name="assignmentId" value={a.id} />
										<input type="hidden" name="templateItemId" value={item.id} />
										<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
										<button type="submit" title="{done ? 'Mark incomplete' : 'Mark complete'}"
											class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors
												{done ? 'border-foreground bg-foreground hover:border-destructive hover:bg-destructive' : 'border-border bg-background hover:border-foreground/50'}">
											{#if done}
												<svg class="h-3 w-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</button>
									</form>
								</td>
							{/each}
						{/if}
					</tr>
				{/each}

				<tr class="border-t border-border/60">
					<td class="sticky left-0 z-10 bg-background py-2.5 pl-3 pr-3 [box-shadow:4px_0_0_0_var(--background)]" colspan={columns.length}>
						<div class="flex items-center gap-3">
							<form method="POST" action="?/addItem"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (result.type === 'success') {
											const id = (result.data as any)?.itemId as string | undefined;
											if (id) { editingItemId = id; editingItemLabel = 'New Task'; }
										}
									};
								}}
								class="contents">
								<button type="submit" class="text-[13px] text-muted-foreground/50 transition-colors hover:text-muted-foreground">
									+ Add task
								</button>
							</form>
							<form method="POST" action="?/addSection" use:enhance class="contents">
								<button type="submit" class="text-[13px] text-muted-foreground/50 transition-colors hover:text-muted-foreground">
									+ Add section
								</button>
							</form>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
{/if}

<div class="flex items-center justify-between">
	<p class="text-[13px] text-muted-foreground">
		{taskItems.length} {taskItems.length === 1 ? 'task' : 'tasks'} · {assignments.length} {assignments.length === 1 ? 'user' : 'users'}
	</p>
	<div class="flex items-center gap-2">
		<label for="hide-completed" class="text-[13px] text-muted-foreground">Hide completed</label>
		<Switch id="hide-completed" bind:checked={hideCompleted} />
	</div>
</div>

<form method="POST" action="?/deleteItem" use:enhance bind:this={deleteFormRef} class="hidden">
	<input type="hidden" name="id" value={confirmDeleteId ?? ''} />
</form>

<AlertDialog.Root open={confirmDeleteId !== null} onOpenChange={(o) => { if (!o) confirmDeleteId = null; }}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay />
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete this row?</AlertDialog.Title>
				<AlertDialog.Description>
					{#if localItems.find(i => i.id === confirmDeleteId)?.type === 'section'}
						The section divider will be removed. Tasks inside it are not affected.
					{:else}
						This removes the task and all completion records for it across every assigned user. This can't be undone.
					{/if}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel onclick={() => (confirmDeleteId = null)}>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					onclick={() => { deleteFormRef?.requestSubmit(); confirmDeleteId = null; }}
				>
					Delete
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
