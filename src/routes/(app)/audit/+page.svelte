<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useAuditParams } from '$lib/query-params';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const [params, helpers] = useAuditParams(page.url);

	function humanizeAction(action: string) {
		return action
			.split('.')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).replace(/_/g, ' '))
			.join(' — ');
	}

	function formatDate(date: Date | null | undefined) {
		if (!date) return '—';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short', day: 'numeric', year: 'numeric',
			hour: 'numeric', minute: '2-digit'
		}).format(new Date(date));
	}

	const filterClass = (active: boolean) =>
		`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
			active
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'
		}`;
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Audit Log</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">Immutable record of all actions in this organization.</p>
		</div>
		<div class="flex items-center gap-1 rounded-lg border bg-muted p-1">
			<button type="button" onclick={() => helpers.remove('subjectType')} class={filterClass(!params.subjectType)}>All</button>
			<button type="button" onclick={() => (params.subjectType = 'employee')} class={filterClass(params.subjectType === 'employee')}>Employees</button>
			<button type="button" onclick={() => (params.subjectType = 'workstation')} class={filterClass(params.subjectType === 'workstation')}>Workstations</button>
		</div>
	</header>

	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.logs.length === 0}
				<div class="flex flex-col items-center justify-center py-24 text-center">
					<p class="text-[14px] font-medium text-foreground">No audit events yet.</p>
					<p class="mt-1 text-[13px] text-muted-foreground">Events will appear here as actions are taken.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Action</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Subject</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actor</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.logs as entry (entry.id)}
							<Table.Row>
								<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] font-medium">
									{humanizeAction(entry.action)}
								</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<div class="flex items-center gap-2">
										<Badge
											variant="outline"
											class="text-[11px] {entry.subjectType === 'employee'
												? 'border-blue-200 bg-blue-50 text-blue-700'
												: 'border-purple-200 bg-purple-50 text-purple-700'}"
										>
											{entry.subjectType}
										</Badge>
										<button
											type="button"
											onclick={() => goto(`/${entry.subjectType}s/${entry.subjectId}`)}
											class="text-[13.5px] text-foreground underline-offset-4 hover:underline"
										>
											{entry.subjectLabel}
										</button>
									</div>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">
									{entry.actorLabel ?? '—'}
								</Table.Cell>
								<Table.Cell class="py-3 pl-3 pr-5 text-right text-[13px] text-muted-foreground">
									{formatDate(entry.createdAt)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

</main>
