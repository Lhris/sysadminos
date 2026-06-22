<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let newRoleName = $state('');
	const error = $derived(form && 'error' in form ? form.error : undefined);
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/employees" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Employees
	</a>

	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Roles</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">Add, rename, or remove the roles available when creating or editing employees.</p>
	</header>

	{#if error}
		<div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">{error}</div>
	{/if}

	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Add a Role</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/add" use:enhance={() => async ({ update }) => { await update(); newRoleName = ''; }} class="flex gap-2">
				<Input name="name" placeholder="e.g. Tax Specialist" bind:value={newRoleName} class="max-w-xs" />
				<Button type="submit" size="sm" disabled={!newRoleName.trim()}>Add Role</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="overflow-hidden">
		<Card.Header class="pb-3">
			<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">All Roles</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-0 p-0">
			{#if data.roles.length === 0}
				<p class="px-5 py-8 text-center text-[13px] text-muted-foreground">No roles yet. Add one above.</p>
			{:else}
				{#each data.roles as r (r.id)}
					<div class="flex items-center gap-3 border-b border-border/60 px-5 py-3 last:border-b-0">
						<form method="POST" action="?/rename" use:enhance class="flex flex-1 items-center gap-2">
							<input type="hidden" name="roleId" value={r.id} />
							<Input name="name" value={r.name} class="h-8 max-w-xs text-[13.5px]" />
							<Button type="submit" variant="outline" size="sm" class="h-8">Save</Button>
						</form>

						<Badge variant="secondary" class="text-[11px]">{r.count} {r.count === 1 ? 'employee' : 'employees'}</Badge>

						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="roleId" value={r.id} />
							<Button type="submit" variant="ghost" size="sm" disabled={r.count > 0}
								class="h-8 text-[12px] text-muted-foreground hover:text-destructive disabled:opacity-40"
								title={r.count > 0 ? 'Reassign employees before deleting' : 'Delete role'}>
								Delete
							</Button>
						</form>
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>

</main>
