<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roleMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
		owner:       { label: 'Owner',     variant: 'default' },
		member:      { label: 'Member',    variant: 'secondary' },
		'view-only': { label: 'View-only', variant: 'outline' }
	};

	function formatDate(d: Date | null | undefined) {
		if (!d) return '—';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(d);
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto px-10 py-9">

	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Admin Panel</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">
			{data.orgs.length} organization{data.orgs.length !== 1 ? 's' : ''} · {data.totalUsers} unique user{data.totalUsers !== 1 ? 's' : ''}
		</p>
	</header>

	{#each data.orgs as org}
		<section>
			<div class="mb-3 flex items-baseline gap-2">
				<h2 class="text-[16px] font-semibold tracking-tight text-foreground">{org.name}</h2>
				{#if org.slug}
					<span class="text-[12px] text-muted-foreground">/{org.slug}</span>
				{/if}
				<span class="ml-auto text-[12px] text-muted-foreground">
					Created {formatDate(org.createdAt)}
				</span>
			</div>

			<Card.Root class="overflow-hidden">
				<Card.Content class="p-0">
					{#if org.members.length === 0}
						<div class="flex items-center justify-center py-8">
							<p class="text-[13px] text-muted-foreground">No members</p>
						</div>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
									<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Email</Table.Head>
									<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Org Role</Table.Head>
									<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">System</Table.Head>
									<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Joined</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each org.members as m}
									<Table.Row>
										<Table.Cell class="py-3 pl-5 pr-3">
											<div class="flex items-center gap-2.5">
												<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-[12px] font-extrabold text-background">
													{m.name.charAt(0).toUpperCase()}
												</div>
												<span class="text-[13.5px] font-medium text-foreground">{m.name}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">{m.email}</Table.Cell>
										<Table.Cell class="px-3 py-3">
											<Badge variant={roleMeta[m.role]?.variant ?? 'outline'} class="text-[11px]">
												{roleMeta[m.role]?.label ?? m.role}
											</Badge>
										</Table.Cell>
										<Table.Cell class="px-3 py-3">
											{#if m.isAdmin}
												<Badge variant="default" class="text-[11px]">Admin</Badge>
											{/if}
										</Table.Cell>
										<Table.Cell class="py-3 pl-3 pr-5 text-right text-[13px] text-muted-foreground">
											{formatDate(m.joinedAt)}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{/each}

	{#if data.orgs.length === 0}
		<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
			<span class="text-[32px] leading-none text-muted-foreground/30">◈</span>
			<p class="text-[14px] font-medium text-foreground">No organizations yet</p>
		</div>
	{/if}

</main>
