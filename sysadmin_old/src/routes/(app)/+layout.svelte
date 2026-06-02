<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { ChevronsUpDown, Check, Building2, Plus } from '@lucide/svelte';

	let { children, data } = $props();

	const navLinks = [
		{ label: 'Dashboard', href: '/dashboard' },
		{ label: 'Employees', href: '/employees' },
		{ label: 'Workstations', href: '/workstations' },
		{ label: 'Checklists', href: '/checklists' },
		{ label: 'Orders', href: '/orders' },
		{ label: 'Audit Log', href: '/audit' },
		{ label: 'Terminations', href: '/terminations' },
		{ label: 'Users', href: '/users' }
	];

	const adminLinks = [
		{ label: 'Admin Panel', href: '/admin' }
	];

	const currentOrg = $derived(
		data.organizations.find(o => o.id === data.organizationId) ?? data.organizations[0]
	);

	async function switchOrg(orgId: string) {
		if (orgId === data.organizationId) return;
		await authClient.organization.setActive({ organizationId: orgId });
		await invalidateAll();
	}
</script>

<div class="flex min-h-screen bg-background">

	<aside class="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r bg-card px-4 py-6">

		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent"
			>
				<Building2 class="h-4 w-4 shrink-0 text-muted-foreground" />
				<span class="font-heading min-w-0 flex-1 truncate text-[13.5px] font-extrabold tracking-tight text-foreground">
					{currentOrg?.name ?? '—'}
				</span>
				<ChevronsUpDown class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
			</DropdownMenu.Trigger>

			<DropdownMenu.Content class="w-[200px]" align="start">
				{#if data.organizations.length > 0}
					<DropdownMenu.Label class="text-muted-foreground text-xs font-normal">Organizations</DropdownMenu.Label>
					{#each data.organizations as org}
						<DropdownMenu.Item
							class="justify-between"
							onclick={() => switchOrg(org.id)}
						>
							<span class="truncate">{org.name}</span>
							{#if org.id === data.organizationId}
								<Check class="h-3.5 w-3.5 shrink-0 text-foreground" />
							{/if}
						</DropdownMenu.Item>
					{/each}
					<DropdownMenu.Separator />
				{/if}
				<DropdownMenu.Item onclick={() => goto('/onboarding')}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					Create organization
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Separator class="my-5 opacity-40" />

		<nav class="flex flex-1 flex-col gap-0.5">
			{#each navLinks as link}
				<a
					href={link.href}
					class="rounded-sm px-2.5 py-[7px] text-[13.5px] no-underline transition-colors hover:bg-accent hover:text-foreground
						{page.url.pathname === link.href
							? 'bg-accent font-semibold text-foreground'
							: 'font-medium text-muted-foreground'}"
				>
					{link.label}
				</a>
			{/each}
			{#if data.isAdmin}
				<Separator class="my-2 opacity-40" />
				{#each adminLinks as link}
					<a
						href={link.href}
						class="rounded-sm px-2.5 py-[7px] text-[13.5px] no-underline transition-colors hover:bg-accent hover:text-foreground
							{page.url.pathname.startsWith(link.href)
								? 'bg-accent font-semibold text-foreground'
								: 'font-medium text-muted-foreground'}"
					>
						{link.label}
					</a>
				{/each}
			{/if}
		</nav>

		<div class="mt-auto">
			<Separator class="mb-4 opacity-40" />
			<div class="flex items-center gap-2.5 px-2">
				<div class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-[13px] font-extrabold text-background">
					{data.user.name.charAt(0).toUpperCase()}
				</div>
				<div class="flex flex-col gap-[3px] min-w-0 flex-1">
					<span class="text-[13px] font-medium leading-none text-foreground truncate">{data.user.name}</span>
					<span class="text-[11px] leading-none text-muted-foreground truncate">{data.user.email}</span>
				</div>
				<button
					onclick={async () => {
						await authClient.signOut({ fetchOptions: { onSuccess: () => goto('/login') } });
					}}
					class="ml-auto shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					title="Sign out"
				>
					↪
				</button>
			</div>
		</div>
	</aside>

	{@render children()}

</div>
