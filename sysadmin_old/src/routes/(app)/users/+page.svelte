<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showInvite = $state(false);

	const isOwner = data.memberRole === 'owner';

	const roleMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
		owner:     { label: 'Owner',     variant: 'default' },
		member:    { label: 'Member',    variant: 'secondary' },
		'view-only': { label: 'View-only', variant: 'outline' }
	};

	function formatDate(d: Date | null) {
		if (!d) return '—';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(d);
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-[28px] leading-none tracking-[-0.035em]">Users</h1>
			<p class="mt-[5px] text-[13px] text-muted-foreground">
				{data.members.length} member{data.members.length !== 1 ? 's' : ''}{data.pendingInvites.length > 0
					? ` · ${data.pendingInvites.length} pending invite${data.pendingInvites.length !== 1 ? 's' : ''}`
					: ''}
			</p>
		</div>
		{#if isOwner}
			<Button size="sm" onclick={() => (showInvite = !showInvite)}>
				{showInvite ? 'Cancel' : 'Invite User'}
			</Button>
		{/if}
	</header>

	{#if showInvite && isOwner}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px]">Invite User</Card.Title>
				<Card.Description>An invitation record will be created for this email and role.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/invite"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type !== 'failure') showInvite = false;
						};
					}}
					class="flex items-end gap-3"
				>
					<div class="flex flex-1 flex-col gap-1.5">
						<label for="invite-email" class="text-[13px] font-medium">Email</label>
						<Input
							id="invite-email"
							name="email"
							type="email"
							placeholder="colleague@example.com"
							required
							class="text-[13px]"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="invite-role" class="text-[13px] font-medium">Role</label>
						<select
							id="invite-role"
							name="role"
							class="border-input h-9 rounded-md border bg-transparent px-3 text-[13px] shadow-xs outline-none focus-visible:ring-3"
						>
							<option value="view-only">View-only</option>
							<option value="member">Member</option>
							<option value="owner">Owner</option>
						</select>
					</div>
					<Button type="submit" size="sm">Send Invite</Button>
				</form>
				{#if form && 'inviteError' in form && form.inviteError}
					<p class="mt-2 text-[12px] text-destructive">{form.inviteError}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Members -->
	<Card.Root class="overflow-hidden">
		<Card.Content class="p-0">
			{#if data.members.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
					<span class="text-[32px] leading-none text-muted-foreground/30">◈</span>
					<p class="text-[14px] font-medium text-foreground">No members yet</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Email</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Role</Table.Head>
							<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Joined</Table.Head>
							{#if isOwner}
								<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.members as m}
							<Table.Row class="group">
								<Table.Cell class="py-3 pl-5 pr-3">
									<div class="flex items-center gap-2.5">
										<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-[12px] font-extrabold text-background">
											{m.name.charAt(0).toUpperCase()}
										</div>
										<span class="text-[13.5px] font-medium text-foreground">
											{m.name}
											{#if m.userId === data.user.id}
												<span class="ml-1 text-[11px] font-normal text-muted-foreground">(you)</span>
											{/if}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13px] text-muted-foreground">{m.email}</Table.Cell>
								<Table.Cell class="px-3 py-3">
									{#if isOwner && m.userId !== data.user.id}
										<form method="POST" action="?/changeRole" use:enhance>
											<input type="hidden" name="memberId" value={m.memberId} />
											<select
												name="role"
												onchange={(e) => e.currentTarget.form?.requestSubmit()}
												class="border-input rounded border bg-transparent px-2 py-1 text-[12px] outline-none focus-visible:ring-1"
											>
												{#each ['owner', 'member', 'view-only'] as r}
													<option value={r} selected={r === m.role}>{roleMeta[r].label}</option>
												{/each}
											</select>
										</form>
									{:else}
										<Badge variant={roleMeta[m.role]?.variant ?? 'outline'} class="text-[11px]">
											{roleMeta[m.role]?.label ?? m.role}
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{formatDate(m.joinedAt)}</Table.Cell>
								{#if isOwner}
									<Table.Cell class="py-3 pl-3 pr-5 text-right">
										{#if m.userId !== data.user.id}
											<form method="POST" action="?/removeMember" use:enhance>
												<input type="hidden" name="memberId" value={m.memberId} />
												<Button
													type="submit"
													variant="ghost"
													size="sm"
													class="h-7 px-2 text-[12px] text-destructive opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
												>
													Remove
												</Button>
											</form>
										{/if}
									</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pending Invitations -->
	{#if data.pendingInvites.length > 0}
		<div>
			<h2 class="mb-3 text-[14px] font-semibold text-foreground">Pending Invitations</h2>
			<Card.Root class="overflow-hidden">
				<Card.Content class="p-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Email</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Role</Table.Head>
								<Table.Head class="px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Expires</Table.Head>
								{#if isOwner}
									<Table.Head class="pl-3 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Actions</Table.Head>
								{/if}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.pendingInvites as inv}
								<Table.Row class="group">
									<Table.Cell class="py-3 pl-5 pr-3 text-[13.5px] font-medium text-foreground">{inv.email}</Table.Cell>
									<Table.Cell class="px-3 py-3">
										<Badge variant={roleMeta[inv.role ?? 'member']?.variant ?? 'outline'} class="text-[11px]">
											{roleMeta[inv.role ?? 'member']?.label ?? inv.role}
										</Badge>
									</Table.Cell>
									<Table.Cell class="px-3 py-3 text-[13.5px] text-muted-foreground">{formatDate(inv.expiresAt)}</Table.Cell>
									{#if isOwner}
										<Table.Cell class="py-3 pl-3 pr-5 text-right">
											<form method="POST" action="?/cancelInvite" use:enhance>
												<input type="hidden" name="inviteId" value={inv.id} />
												<Button
													type="submit"
													variant="ghost"
													size="sm"
													class="h-7 px-2 text-[12px] opacity-0 transition-opacity group-hover:opacity-100"
												>
													Cancel
												</Button>
											</form>
										</Table.Cell>
									{/if}
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

</main>
