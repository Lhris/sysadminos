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

	type Ref = { type: string; id: string; label: string };
	type Segment = string | { label: string; href: string };

	// Subject detail routes. Templates live under checklists; everything else
	// follows the /<type>s/<id> convention.
	function pathFor(type: string, id: string) {
		if (type === 'template') return `/checklists/templates/${id}`;
		return `/${type}s/${id}`;
	}

	function link(ref: Ref): Segment {
		return { label: ref.label, href: pathFor(ref.type, ref.id) };
	}

	function humanizeAction(action: string) {
		return action
			.split('.')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).replace(/_/g, ' '))
			.join(' — ');
	}

	// High-level grouping for the Area column.
	const AREA = {
		workstation: { label: 'Workstations', class: 'border-purple-200 bg-purple-50 text-purple-700' },
		admin: { label: 'Administration', class: 'border-amber-200 bg-amber-50 text-amber-700' },
		employee: { label: 'Employees', class: 'border-blue-200 bg-blue-50 text-blue-700' },
		checklist: { label: 'Checklists', class: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
	} as const;

	function areaFor(action: string): (typeof AREA)[keyof typeof AREA] {
		// Assignments span two subjects — treat them as administrative actions.
		if (action.endsWith('.assigned') || action.endsWith('.unassigned') || action.endsWith('.reassigned'))
			return AREA.admin;
		if (action.startsWith('workstation.')) return AREA.workstation;
		if (action.startsWith('checklist.')) return AREA.checklist;
		if (action.startsWith('employee.')) return AREA.employee;
		return AREA.admin;
	}

	// Builds a human sentence as a list of segments — plain strings render as
	// text, objects render as clickable links to the subject.
	function describe(entry: PageData['logs'][number]): Segment[] {
		let m: Record<string, any> | null = null;
		try {
			m = entry.metadata ? JSON.parse(entry.metadata) : null;
		} catch {
			m = null;
		}

		const self = link({ type: entry.subjectType, id: entry.subjectId, label: entry.subjectLabel });
		const rel: Segment | null = m?.related ? link(m.related as Ref) : null;
		// For assign/unassign either subject orientation is possible; pick the
		// device/template vs. the person regardless of which row we're on.
		const device = entry.subjectType === 'employee' ? rel : self;
		const person = entry.subjectType === 'employee' ? self : rel;

		switch (entry.action) {
			case 'workstation.assigned':
				return ['Assigned ', device, ' to ', person].filter(Boolean) as Segment[];
			case 'workstation.unassigned':
				return ['Unassigned ', device, ' from ', person].filter(Boolean) as Segment[];
			case 'workstation.reassigned': {
				const from: Segment | null = m?.from ? link({ type: 'employee', ...m.from }) : null;
				const to: Segment | null = m?.to ? link({ type: 'employee', ...m.to }) : null;
				return ['Reassigned ', self, ' from ', from, ' to ', to].filter(Boolean) as Segment[];
			}
			case 'checklist.assigned':
				return ['Assigned checklist ', rel ?? (m?.templateName ?? 'template'), ' to ', self];
			case 'employee.created':
				return ['Created employee ', self];
			case 'employee.terminated':
				return ['Terminated ', self];
			case 'employee.updated':
				return ['Updated ', self];
			case 'employee.status_changed':
				return ['Changed ', self, ` status from ${m?.from ?? '?'} to ${m?.to ?? '?'}`];
			case 'workstation.created':
				return ['Added workstation ', self];
			case 'workstation.updated':
				return ['Updated ', self];
			case 'workstation.status_changed':
				return ['Changed ', self, ` status from ${m?.from ?? '?'} to ${m?.to ?? '?'}`];
			default:
				return [humanizeAction(entry.action) + ' ', self];
		}
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
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">User</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Area</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Action</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">IP</Table.Head>
							<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Time</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.logs as entry (entry.id)}
							{@const area = areaFor(entry.action)}
							<Table.Row>
								<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] text-muted-foreground">
									{entry.actorEmail ?? entry.actorLabel ?? '—'}
								</Table.Cell>
								<Table.Cell class="px-3 py-3">
									<Badge variant="outline" class="text-[11px] {area.class}">{area.label}</Badge>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px]">
									<span class="text-foreground">
										{#each describe(entry) as part}
											{#if typeof part === 'string'}{part}{:else}<button
													type="button"
													onclick={() => goto(part.href)}
													class="font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
												>{part.label}</button>{/if}
										{/each}
									</span>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 font-mono text-[12.5px] text-muted-foreground">
									{entry.ipAddress ?? '—'}
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
