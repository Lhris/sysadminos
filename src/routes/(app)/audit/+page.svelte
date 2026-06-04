<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
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
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(date));
	}

	const filterClass = (active: boolean) =>
		`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
			active
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'
		}`;
</script>

<div class="p-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Audit Log</h1>
			<p class="mt-1 text-sm text-muted-foreground">Immutable record of all actions in this organization.</p>
		</div>

		<div class="flex items-center gap-1 rounded-lg border bg-muted p-1">
			<button type="button" onclick={() => helpers.remove('subjectType')} class={filterClass(!params.subjectType)}>All</button>
			<button type="button" onclick={() => (params.subjectType = 'employee')} class={filterClass(params.subjectType === 'employee')}>Employees</button>
			<button type="button" onclick={() => (params.subjectType = 'workstation')} class={filterClass(params.subjectType === 'workstation')}>Workstations</button>
		</div>
	</div>

	{#if data.logs.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<p class="text-sm font-medium text-muted-foreground">No audit events yet.</p>
			<p class="mt-1 text-xs text-muted-foreground">Events will appear here as actions are taken.</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Action</Table.Head>
					<Table.Head>Subject</Table.Head>
					<Table.Head>Actor</Table.Head>
					<Table.Head class="text-right">Date</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.logs as entry (entry.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							{humanizeAction(entry.action)}
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<Badge
									variant="outline"
									class={entry.subjectType === 'employee'
										? 'border-blue-200 bg-blue-50 text-blue-700'
										: 'border-purple-200 bg-purple-50 text-purple-700'}
								>
									{entry.subjectType}
								</Badge>
								<button
									type="button"
									onclick={() => goto(`/${entry.subjectType}s/${entry.subjectId}`)}
									class="text-sm text-foreground underline-offset-4 hover:underline"
								>
									{entry.subjectLabel}
								</button>
							</div>
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">
							{entry.actorLabel ?? '—'}
						</Table.Cell>
						<Table.Cell class="text-right text-sm text-muted-foreground">
							{formatDate(entry.createdAt)}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
