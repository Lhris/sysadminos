<script lang="ts">
    import { page } from '$app/state';
    import { invalidateAll } from '$app/navigation';
    import { goto } from '$app/navigation';
    import { authClient } from '$lib/auth-client';
    import { Separator } from '$lib/components/ui/separator';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Building2, ChevronsUpDown, Check, Plus, LogOut } from '@lucide/svelte';

    let { children, data } = $props();

    const navLinks = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: 'Workstations', href: '/workstations' },
        { label: 'Platforms', href: '/platforms' },
        { label: 'Checklists', href: '/checklists' },
        { label: 'Automations', href: '/automations' },
        { label: 'Orders', href: '/orders' },
        { label: 'Audit Log', href: '/audit' },
        { label: 'Terminations', href: '/terminations' },
        { label: 'Users', href: '/users' }
    ];

    const devLinks = [
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
            <DropdownMenu.Trigger class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent">
                <Building2 class="size-4 shrink-0 text-muted-foreground" />
                <span class="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight text-foreground">
                    {currentOrg?.name ?? '—'}
                </span>
                <ChevronsUpDown class="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-[200px]" align="start">
                {#if data.organizations.length > 0}
                    <DropdownMenu.Label class="text-xs font-normal text-muted-foreground">Organizations</DropdownMenu.Label>
                    {#each data.organizations as org (org.id)}
                        <DropdownMenu.Item class="justify-between" onclick={() => switchOrg(org.id)}>
                            <span class="truncate">{org.name}</span>
                            {#if org.id === data.organizationId}
                                <Check class="size-3.5 shrink-0" />
                            {/if}
                        </DropdownMenu.Item>
                    {/each}
                    <DropdownMenu.Separator />
                {/if}
                <DropdownMenu.Item onclick={() => goto('/admin')}>
                    <Plus class="mr-1.5 size-3.5" />
                    Create organization
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>

        <Separator class="my-5" />

        <nav class="flex flex-1 flex-col gap-0.5">
            {#each navLinks as link (link.href)}
                <a
                    href={link.href}
                    class="rounded-md px-2.5 py-[7px] text-[13.5px] font-medium no-underline transition-colors hover:bg-accent hover:text-foreground
                        {page.url.pathname === link.href ? 'bg-accent text-foreground' : 'text-muted-foreground'}"
                >
                    {link.label}
                </a>
            {/each}
            {#if data.isDev}
                <Separator class="my-2" />
                {#each devLinks as link (link.href)}
                    <a
                        href={link.href}
                        class="rounded-md px-2.5 py-[7px] text-[13.5px] font-medium no-underline transition-colors hover:bg-accent hover:text-foreground
                            {page.url.pathname.startsWith(link.href) ? 'bg-accent text-foreground' : 'text-muted-foreground'}"
                    >
                        {link.label}
                    </a>
                {/each}
            {/if}
        </nav>

        <div class="mt-auto">
            <Separator class="mb-4" />
            <div class="flex items-center gap-2.5 px-2">
                <div class="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-bold text-background">
                    {data.user.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span class="truncate text-[13px] font-medium leading-none text-foreground">{data.user.name}</span>
                    <span class="truncate text-[11px] leading-none text-muted-foreground">{data.user.email}</span>
                </div>
                <button
                    onclick={async () => {
                        await authClient.signOut({ fetchOptions: { onSuccess: () => goto('/login') } });
                    }}
                    class="ml-auto shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                    title="Sign out"
                >
                    <LogOut class="size-3.5" />
                </button>
            </div>
        </div>
    </aside>

    <div class="flex-1 min-w-0 bg-[#f9f9f7]">
        {@render children()}
    </div>
</div>
