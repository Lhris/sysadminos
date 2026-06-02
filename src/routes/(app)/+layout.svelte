<script lang="ts">
    import { page } from '$app/state';
    import { invalidateAll } from '$app/navigation';
    import { authClient } from '$lib/auth-client';
    import { goto } from '$app/navigation';
    import { Building2, ChevronsUpDown, Check, Plus, LogOut } from '@lucide/svelte';

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

    const devLinks = [
        { label: 'Admin Panel', href: '/admin' }
    ];

    const currentOrg = $derived(
        data.organizations.find(o => o.id === data.organizationId) ?? data.organizations[0]
    );

    let orgMenuOpen = $state(false);

    async function switchOrg(orgId: string) {
        if (orgId === data.organizationId) return;
        orgMenuOpen = false;
        await authClient.organization.setActive({ organizationId: orgId });
        await invalidateAll();
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://api.fontshare.com" />
    <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shell">
    <aside class="sidebar">

        <!-- Org switcher -->
        <div class="org-switcher">
            <button class="org-trigger" onclick={() => orgMenuOpen = !orgMenuOpen}>
                <Building2 size={15} color="#737373" />
                <span class="org-name">{currentOrg?.name ?? '—'}</span>
                <ChevronsUpDown size={13} color="#737373" />
            </button>

            {#if orgMenuOpen}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="overlay" onclick={() => orgMenuOpen = false} onkeydown={() => orgMenuOpen = false}></div>
                <div class="org-menu">
                    {#if data.organizations.length > 0}
                        <p class="menu-label">Organizations</p>
                        {#each data.organizations as org}
                            <button class="menu-item" onclick={() => switchOrg(org.id)}>
                                <span class="menu-item-name">{org.name}</span>
                                {#if org.id === data.organizationId}
                                    <Check size={13} color="#0a0a0a" />
                                {/if}
                            </button>
                        {/each}
                        <div class="menu-sep"></div>
                    {/if}
                    <button class="menu-item" onclick={() => { orgMenuOpen = false; goto('/onboarding'); }}>
                        <Plus size={13} color="#737373" />
                        <span>Create organization</span>
                    </button>
                </div>
            {/if}
        </div>

        <div class="sep"></div>

        <nav class="nav">
            {#each navLinks as link}
                <a
                    href={link.href}
                    class="nav-link"
                    class:active={page.url.pathname === link.href}
                >
                    {link.label}
                </a>
            {/each}
            {#if data.isDev}
                <div class="sep sep-sm"></div>
                {#each devLinks as link}
                    <a
                        href={link.href}
                        class="nav-link"
                        class:active={page.url.pathname.startsWith(link.href)}
                    >
                        {link.label}
                    </a>
                {/each}
            {/if}
        </nav>

        <div class="user">
            <div class="sep"></div>
            <div class="user-row">
                <div class="avatar">{data.user.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <span class="user-name">{data.user.name}</span>
                    <span class="user-email">{data.user.email}</span>
                </div>
                <button
                    class="signout"
                    title="Sign out"
                    onclick={async () => {
                        await authClient.signOut({ fetchOptions: { onSuccess: () => goto('/login') } });
                    }}
                >
                    <LogOut size={13} />
                </button>
            </div>
        </div>

    </aside>

    <div class="content">
        {@render children()}
    </div>
</div>

<style>
    .shell {
        display: flex;
        min-height: 100vh;
        background: #f5f5f0;
        font-family: 'Satoshi', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        color: #0a0a0a;
    }

    /* ── Sidebar ── */
    .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        width: 220px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: rgba(250, 250, 248, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(0, 0, 0, 0.06);
        padding: 20px 14px;
    }

    /* ── Org switcher ── */
    .org-switcher {
        position: relative;
    }
    .org-trigger {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
        font-family: 'Satoshi', system-ui, sans-serif;
    }
    .org-trigger:hover {
        background: rgba(0, 0, 0, 0.04);
    }
    .org-name {
        font-family: 'Cabinet Grotesk', sans-serif;
        font-weight: 800;
        font-size: 13.5px;
        letter-spacing: -0.025em;
        color: #0a0a0a;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .overlay {
        position: fixed;
        inset: 0;
        z-index: 10;
    }
    .org-menu {
        position: absolute;
        left: 0;
        top: calc(100% + 4px);
        z-index: 20;
        width: 200px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.07);
        border-radius: 12px;
        padding: 6px;
        box-shadow:
            0 8px 40px -8px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(0, 0, 0, 0.02);
    }
    .menu-label {
        font-size: 11px;
        font-weight: 500;
        color: #737373;
        padding: 4px 8px;
        letter-spacing: 0.04em;
    }
    .menu-item {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 7px;
        padding: 7px 8px;
        border-radius: 7px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-family: 'Satoshi', system-ui, sans-serif;
        font-size: 13px;
        color: #0a0a0a;
        text-align: left;
        transition: background 0.15s;
    }
    .menu-item:hover {
        background: rgba(0, 0, 0, 0.04);
    }
    .menu-item-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .menu-sep {
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        margin: 4px 0;
    }

    /* ── Separators ── */
    .sep {
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        margin: 16px 0;
    }
    .sep-sm {
        margin: 8px 0;
    }

    /* ── Nav ── */
    .nav {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 1px;
    }
    .nav-link {
        display: block;
        padding: 7px 10px;
        border-radius: 7px;
        font-size: 13.5px;
        font-weight: 500;
        color: #737373;
        text-decoration: none;
        transition: background 0.15s, color 0.15s;
    }
    .nav-link:hover {
        background: rgba(0, 0, 0, 0.04);
        color: #0a0a0a;
    }
    .nav-link.active {
        background: rgba(0, 0, 0, 0.06);
        color: #0a0a0a;
        font-weight: 600;
    }

    /* ── User row ── */
    .user {
        margin-top: auto;
    }
    .user-row {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 0 4px;
    }
    .avatar {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #0a0a0a;
        color: #fafaf8;
        font-family: 'Cabinet Grotesk', sans-serif;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .user-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .user-name {
        font-size: 13px;
        font-weight: 500;
        color: #0a0a0a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
    }
    .user-email {
        font-size: 11px;
        color: #737373;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
    }
    .signout {
        flex-shrink: 0;
        background: transparent;
        border: none;
        cursor: pointer;
        color: #737373;
        padding: 4px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        transition: color 0.15s, background 0.15s;
    }
    .signout:hover {
        color: #0a0a0a;
        background: rgba(0, 0, 0, 0.04);
    }

    /* ── Content area ── */
    .content {
        flex: 1;
        min-width: 0;
    }
</style>
