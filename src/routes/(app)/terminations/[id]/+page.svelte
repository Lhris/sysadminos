<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const emp = $derived(data.employee);

	const selectClass =
		'flex h-8 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

	const platformDone = $derived(data.licenses.filter((l) => l.removedAt).length);
	const allPlatformsDone = $derived(data.licenses.length > 0 && platformDone === data.licenses.length);

	function doneIdsFor(assignmentId: string) {
		return new Set(data.completions.filter((c) => c.assignmentId === assignmentId).map((c) => c.templateItemId));
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/terminations" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Terminations
	</a>

	<header class="flex items-start justify-between">
		<div class="flex items-center gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-[18px] font-extrabold text-destructive">
				{emp?.firstName?.[0] ?? '?'}{emp?.lastName?.[0] ?? ''}
			</div>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-[24px] leading-none tracking-[-0.03em]">{emp?.firstName} {emp?.lastName}</h1>
					<Badge variant={emp.status === 'terminated' ? 'destructive' : 'outline'} class="text-[11px] {emp.status === 'pending_termination' ? 'border-amber-300 text-amber-700' : ''}">
						{emp.status === 'terminated' ? 'Terminated' : 'Pending termination'}
					</Badge>
				</div>
				<p class="mt-1 text-[13px] text-muted-foreground">{emp?.role}</p>
			</div>
		</div>
		<a href="/employees/{emp.id}" class="text-[12px] font-medium text-muted-foreground no-underline hover:text-foreground">View profile →</a>
	</header>

	<div class="grid grid-cols-[1fr_360px] items-start gap-4">

		<!-- Platform removals -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between pb-3">
				<div>
					<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Platform removals</Card.Title>
					<Card.Description class="text-[12px]">Live from this employee's platform licenses.</Card.Description>
				</div>
				<span class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{platformDone}/{data.licenses.length}</span>
			</Card.Header>
			<Card.Content class="p-0">
				{#if data.licenses.length > 0}
					<div class="flex items-center gap-3 border-b px-5 py-3">
						<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
							<div class="h-full rounded-full {allPlatformsDone ? 'bg-emerald-500' : 'bg-foreground'}" style="width: {(platformDone / data.licenses.length) * 100}%"></div>
						</div>
					</div>
				{/if}

				{#if data.licenses.length === 0}
					<div class="px-5 py-10 text-center">
						<p class="text-[13px] text-muted-foreground">No platform licenses are linked to this employee.</p>
						<p class="mt-0.5 text-[12px] text-muted-foreground">Link their licenses under Platforms to track removals here.</p>
					</div>
				{:else}
					{#each data.licenses as l (l.id)}
						{@const done = !!l.removedAt}
						<div class="group flex items-center gap-3 border-b border-border/60 px-5 py-3 last:border-b-0">
							<form method="POST" action="?/togglePlatformRemoval" use:enhance class="shrink-0">
								<input type="hidden" name="licenseId" value={l.id} />
								<input type="hidden" name="removing" value={done ? 'false' : 'true'} />
								<button type="submit" class="flex h-4 w-4 items-center justify-center rounded border-[1.5px] transition-colors {done ? 'border-foreground bg-foreground' : 'border-border bg-background hover:border-foreground/50'}">
									{#if done}
										<svg class="h-2.5 w-2.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
									{/if}
								</button>
							</form>
							<div class="flex min-w-0 flex-1 flex-col">
								<a href="/platforms/{l.platformId}" class="text-[13.5px] no-underline {done ? 'text-muted-foreground line-through' : 'font-medium text-foreground hover:underline'}">{l.platformName}</a>
								{#if l.matchEmail ?? l.displayName}<span class="truncate text-[11.5px] text-muted-foreground">{l.matchEmail ?? l.displayName}</span>{/if}
							</div>
							{#if done && l.removedByLabel}
								<span class="shrink-0 text-[11px] text-muted-foreground">by {l.removedByLabel}</span>
							{/if}
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Termination checklists -->
		<Card.Root class="overflow-hidden">
			<Card.Header class="pb-3">
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Checklists</Card.Title>
				<Card.Description class="text-[12px]">Attach a termination checklist (managed in /checklists).</Card.Description>
			</Card.Header>
			<Card.Content class="p-0">
				{#if data.availableTemplates.length > 0}
					<form method="POST" action="?/addChecklist" use:enhance class="flex gap-2 border-b px-5 py-3">
						<select name="templateId" class="{selectClass} min-w-0 flex-1">
							<option value="" disabled selected>Select checklist…</option>
							{#each data.availableTemplates as t (t.id)}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
						<Button type="submit" size="sm" class="shrink-0">Attach</Button>
					</form>
				{/if}
				{#if form?.addError}<p class="px-5 pt-2 text-[12px] text-destructive">{form.addError}</p>{/if}

				{#if data.assignments.length === 0}
					<div class="px-5 py-8 text-center text-[13px] text-muted-foreground">
						No termination checklists attached.
						{#if data.availableTemplates.length === 0}
							<a href="/checklists" class="mt-1 block text-[12px] underline hover:text-foreground">Create a termination checklist →</a>
						{/if}
					</div>
				{:else}
					{#each data.assignments as a (a.id)}
						{@const items = data.templateItems.filter((i) => i.templateId === a.templateId)}
						{@const tasks = items.filter((i) => i.type === 'task')}
						{@const doneIds = doneIdsFor(a.id)}
						{@const doneCount = tasks.filter((i) => doneIds.has(i.id)).length}
						<div class="border-b border-border/60 px-5 py-3 last:border-b-0">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-[13px] font-semibold text-foreground">{a.templateName}</span>
								<div class="flex items-center gap-2">
									<span class="text-[11px] tabular-nums text-muted-foreground">{doneCount}/{tasks.length}</span>
									<form method="POST" action="?/removeChecklist" use:enhance>
										<input type="hidden" name="assignmentId" value={a.id} />
										<button type="submit" class="text-[11px] text-muted-foreground transition-colors hover:text-destructive">Remove</button>
									</form>
								</div>
							</div>
							<div class="flex flex-col">
								{#each items as item (item.id)}
									{#if item.type === 'section'}
										<div class="mb-0.5 mt-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground first:mt-0">{item.label}</div>
									{:else}
										{@const done = doneIds.has(item.id)}
										<div class="flex items-center gap-2.5 rounded-md px-1 py-[5px]">
											<form method="POST" action="?/toggleChecklistItem" use:enhance class="shrink-0">
												<input type="hidden" name="assignmentId" value={a.id} />
												<input type="hidden" name="templateItemId" value={item.id} />
												<input type="hidden" name="completing" value={done ? 'false' : 'true'} />
												<button type="submit" class="flex h-4 w-4 items-center justify-center rounded border-[1.5px] transition-colors {done ? 'border-foreground bg-foreground' : 'border-border bg-background hover:border-foreground/50'}">
													{#if done}
														<svg class="h-2.5 w-2.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
													{/if}
												</button>
											</form>
											<span class="text-[13px] {done ? 'text-muted-foreground line-through' : 'text-foreground'}">{item.label}</span>
										</div>
									{/if}
								{/each}
								{#if items.length === 0}<p class="px-1 text-[12px] italic text-muted-foreground">No tasks defined.</p>{/if}
							</div>
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

	</div>

</main>
