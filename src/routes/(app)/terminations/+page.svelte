<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pending = $derived(data.terminations.filter((t) => t.status === 'pending_termination'));
	const terminated = $derived(data.terminations.filter((t) => t.status === 'terminated'));

	// Row click opens the termination, but not when the click lands on an
	// interactive control (links/buttons).
	function rowClick(e: MouseEvent, employeeId: string) {
		if ((e.target as HTMLElement).closest('input,button,a,[role="menu"]')) return;
		goto(`/terminations/${employeeId}`);
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Terminations</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">
			{pending.length} pending · {terminated.length} terminated. Anyone whose status is pending termination or terminated shows here automatically.
		</p>
	</header>

	{#snippet progress(done: number, total: number)}
		{#if total === 0}
			<span class="text-[12px] text-muted-foreground">—</span>
		{:else}
			{@const allDone = done === total}
			<div class="flex items-center gap-2">
				<div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
					<div class="h-full rounded-full {allDone ? 'bg-emerald-500' : 'bg-foreground'}" style="width: {(done / total) * 100}%"></div>
				</div>
				<span class="text-[12px] tabular-nums text-muted-foreground">{done}/{total}</span>
			</div>
		{/if}
	{/snippet}

	{#snippet terminationsTable(rows: typeof data.terminations, emptyText: string)}
		<Card.Root class="overflow-hidden">
			<Card.Content class="p-0">
				{#if rows.length === 0}
					<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
						<span class="text-[32px] leading-none text-muted-foreground/30">⊗</span>
						<p class="text-[13px] text-muted-foreground">{emptyText}</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Employee</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Role</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Platform removals</Table.Head>
								<Table.Head class="px-3 pr-5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Checklists</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each rows as t (t.employeeId)}
								<Table.Row onclick={(e) => rowClick(e, t.employeeId)} class="group cursor-pointer">
									<Table.Cell class="py-3 pl-5 pr-3">
										<a href="/terminations/{t.employeeId}" class="text-[13.5px] font-medium text-foreground no-underline hover:underline">{t.firstName} {t.lastName}</a>
									</Table.Cell>
									<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{t.role}</Table.Cell>
									<Table.Cell class="px-3 py-3">{@render progress(t.platformDone, t.platformTotal)}</Table.Cell>
									<Table.Cell class="px-3 py-3 pr-5">{@render progress(t.checklistDone, t.checklistTotal)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/snippet}

	<Tabs.Root value="pending">
		<Tabs.List>
			<Tabs.Trigger value="pending">
				Pending termination
				<Badge variant="secondary" class="ml-2 text-[11px] tabular-nums">{pending.length}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="terminated">
				Terminated
				<Badge variant="secondary" class="ml-2 text-[11px] tabular-nums">{terminated.length}</Badge>
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="pending" class="mt-4">
			{@render terminationsTable(pending, 'No one is pending termination.')}
		</Tabs.Content>
		<Tabs.Content value="terminated" class="mt-4">
			{@render terminationsTable(terminated, 'No terminated employees.')}
		</Tabs.Content>
	</Tabs.Root>

</main>
