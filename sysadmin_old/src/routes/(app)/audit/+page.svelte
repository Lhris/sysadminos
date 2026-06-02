<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { relativeTime } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type EntityType = 'employee' | 'workstation' | 'order' | string;
	let activeFilter = $state<EntityType | 'all'>('all');

	const entityTypes = [...new Set(data.events.map((e) => e.entityType))];

	const filtered = $derived(
		activeFilter === 'all'
			? data.events
			: data.events.filter((e) => e.entityType === activeFilter)
	);

	const entityConfig: Record<string, { symbol: string; href: (id: string) => string }> = {
		employee:    { symbol: '◈', href: (id) => `/employees/${id}` },
		workstation: { symbol: '⬡', href: (id) => `/workstations/${id}` },
		order:       { symbol: '◇', href: (id) => `/orders/${id}` }
	};

	const actionLabels: Record<string, string> = {
		'employee.created':        'Employee created',
		'employee.updated':        'Employee updated',
		'employee.status_changed': 'Status changed',
		'employee.terminated':     'Employee terminated',
		'workstation.assigned':    'Workstation assigned',
		'workstation.removed':     'Workstation removed',
		'workstation.created':     'Workstation added',
		'order.created':           'Order created',
		'order.updated':           'Order updated',
		'order.fulfilled':         'Order fulfilled',
		'order.cancelled':         'Order cancelled'
	};

	function actionLabel(action: string) {
		return actionLabels[action] ?? action;
	}

	function entitySymbol(type: string) {
		return entityConfig[type]?.symbol ?? '◎';
	}

	function entityHref(type: string, id: string) {
		return entityConfig[type]?.href(id) ?? '#';
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<!-- Header -->
	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Audit Log</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.events.length} total events · immutable record of all system activity
			</p>
		</div>
	</header>

	<!-- Filter bar -->
	{#if entityTypes.length > 0}
		<div class="flex items-center gap-1.5">
			<button
				onclick={() => (activeFilter = 'all')}
				class="rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors
					{activeFilter === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
			>
				All <span class="ml-1 text-[11px] opacity-60">{data.events.length}</span>
			</button>
			{#each entityTypes as type}
				<button
					onclick={() => (activeFilter = type)}
					class="rounded-sm px-3 py-1.5 text-[13px] font-medium capitalize transition-colors
						{activeFilter === type ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{type}s <span class="ml-1 text-[11px] opacity-60">{data.events.filter((e) => e.entityType === type).length}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Table -->
	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◎</span>
					<p class="text-[14px] font-medium text-foreground">No events yet</p>
					<p class="text-[13px] text-muted-foreground">
						Events will appear here as actions are taken across the system.
					</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Event</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Entity</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actor</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Time</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as event}
							<Table.Row>
								<Table.Cell class="py-3 pl-5 pr-3">
									<span class="text-[13.5px] font-medium text-foreground">
										{actionLabel(event.action)}
									</span>
								</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<a
										href={entityHref(event.entityType, event.entityId)}
										class="flex items-center gap-2 no-underline"
									>
										<span class="text-[14px] leading-none text-muted-foreground">
											{entitySymbol(event.entityType)}
										</span>
										<span class="text-[13px] text-foreground hover:underline">
											{event.entityLabel}
										</span>
									</a>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">
									{event.actorLabel ?? '—'}
								</Table.Cell>
								<Table.Cell class="py-3 pl-3 pr-5 text-right">
									<span
										class="text-[12.5px] text-muted-foreground"
										title={event.createdAt?.toLocaleString()}
									>
										{relativeTime(event.createdAt)}
									</span>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

</main>
