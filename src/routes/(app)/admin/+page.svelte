<script lang="ts">
    import { enhance } from '$app/forms';
    import * as Table from '$lib/components/ui/table';
    import * as Select from '$lib/components/ui/select';
    import * as Sheet from '$lib/components/ui/sheet';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';

    let { data, form } = $props();

    type Tab = 'users' | 'organizations' | 'invitations';
    let tab = $state<Tab>('users');

    // User edit sheet
    let sheetOpen = $state(false);
    let selectedUser = $state<typeof data.users[0] | null>(null);

    type EditOrg = { id: string; orgId: string; orgName: string; role: string; isNew: boolean };
    let editName = $state('');
    let editEmailVerified = $state(false);
    let editIsDev = $state(false);
    let editOrgs = $state<EditOrg[]>([]);
    let originalOrgs = $state<EditOrg[]>([]);
    let showAddOrg = $state(false);
    let addOrgId = $state('');
    let addOrgRole = $state('member');

    function openUser(u: typeof data.users[0]) {
        selectedUser = u;
        editName = u.name;
        editEmailVerified = u.emailVerified;
        editIsDev = u.isDev;
        const orgs = userOrgs(u.id).map(m => ({ id: m.id, orgId: m.organizationId, orgName: m.orgName, role: m.role, isNew: false }));
        editOrgs = [...orgs];
        originalOrgs = [...orgs];
        showAddOrg = false;
        addOrgId = '';
        addOrgRole = 'member';
        sheetOpen = true;
    }

    const editOrgsAvailable = $derived(
        data.organizations.filter(o => !editOrgs.some(e => e.orgId === o.id))
    );

    $effect(() => {
        if (editOrgsAvailable.length > 0 && !addOrgId) addOrgId = editOrgsAvailable[0].id;
    });

    function addOrgToEdit() {
        if (!addOrgId) return;
        const org = data.organizations.find(o => o.id === addOrgId);
        if (!org) return;
        editOrgs = [...editOrgs, { id: '', orgId: org.id, orgName: org.name, role: addOrgRole, isNew: true }];
        addOrgId = editOrgsAvailable.filter(o => o.id !== addOrgId)[0]?.id ?? '';
        addOrgRole = 'member';
    }

    function removeOrgFromEdit(orgId: string) {
        editOrgs = editOrgs.filter(e => e.orgId !== orgId);
    }

    function updateOrgRole(orgId: string, role: string) {
        editOrgs = editOrgs.map(e => e.orgId === orgId ? { ...e, role } : e);
    }

    function getSavePayload() {
        const addMembers = editOrgs.filter(e => e.isNew).map(e => ({ orgId: e.orgId, role: e.role }));
        const removedIds = originalOrgs.filter(o => !editOrgs.some(e => e.orgId === o.orgId)).map(o => o.id);
        const updateMembers = editOrgs.filter(e => !e.isNew).map(e => ({ id: e.id, role: e.role }));
        return { addMembers, removeMembers: removedIds, updateMembers };
    }

    // Orgs state
    let newOrgName = $state('');
    let selectedOrgId = $state<string | null>(null);

    // Invite state
    let inviteEmail = $state('');
    let inviteName = $state('');
    let inviteOrgId = $state(data.organizations[0]?.id ?? '');
    let inviteRole = $state('member');

    // Per-member pending roles
    let pendingRoles = $state<Record<string, string>>({});

    // Per-org add member state
    let addMemberByOrg = $state<Record<string, { userId: string; role: string }>>({});
    function getAddMember(orgId: string) {
        if (!addMemberByOrg[orgId]) {
            addMemberByOrg[orgId] = { userId: nonMembers(orgId)[0]?.id ?? '', role: 'member' };
        }
        return addMemberByOrg[orgId];
    }

    const orgMembers = $derived.by(() => (orgId: string) =>
        data.allMembers.filter(m => m.organizationId === orgId)
    );

    const userOrgs = $derived.by(() => (userId: string) =>
        data.allMembers.filter(m => m.userId === userId)
    );

    const orgsNotIn = $derived.by(() => (userId: string) => {
        const ids = new Set(data.allMembers.filter(m => m.userId === userId).map(m => m.organizationId));
        return data.organizations.filter(o => !ids.has(o.id));
    });

    const nonMembers = $derived.by(() => (orgId: string) => {
        const ids = new Set(data.allMembers.filter(m => m.organizationId === orgId).map(m => m.userId));
        return data.users.filter(u => !ids.has(u.id));
    });

    const sheetOrgsAvailable = $derived(selectedUser ? orgsNotIn(selectedUser.id) : []);

    $effect(() => {
        if (sheetOrgsAvailable.length > 0) sheetAddOrgId = sheetOrgsAvailable[0].id;
    });

    function orgLabel(id: string) { return data.organizations.find(o => o.id === id)?.name ?? 'Select org…'; }
    function roleLabel(r: string) { return r || 'Select role'; }
    function userLabel(id: string) {
        const u = data.users.find(u => u.id === id);
        return u ? `${u.name} (${u.email})` : 'Select user…';
    }

    function formatDate(d: string | Date) {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function isExpired(d: string | Date) { return new Date(d) < new Date(); }

    const roles = ['member', 'admin', 'owner'] as const;
</script>

<div class="p-8 max-w-5xl">
    <div class="mb-8">
        <h1 class="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p class="text-sm text-muted-foreground mt-1">Dev-only. Manage users, organizations, and invitations.</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b mb-6">
        {#each (['users', 'organizations', 'invitations'] as const) as id (id)}
            {@const labels = { users: 'Users', organizations: 'Organizations', invitations: 'Invitations' }}
            {@const counts = { users: data.users.length, organizations: data.organizations.length, invitations: data.invitations.length }}
            <button
                onclick={() => tab = id}
                class="px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
                    {tab === id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
            >
                {labels[id]}
                <span class="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{counts[id]}</span>
            </button>
        {/each}
    </div>

    <!-- Users -->
    {#if tab === 'users'}
        <div class="rounded-lg border bg-card overflow-hidden">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Name</Table.Head>
                        <Table.Head>Email</Table.Head>
                        <Table.Head>Verified</Table.Head>
                        <Table.Head>Organizations</Table.Head>
                        <Table.Head>Joined</Table.Head>
                        <Table.Head>Dev</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each data.users as u (u.id)}
                        <Table.Row class="cursor-pointer" onclick={() => openUser(u)}>
                            <Table.Cell class="font-medium">{u.name}</Table.Cell>
                            <Table.Cell class="text-muted-foreground">{u.email}</Table.Cell>
                            <Table.Cell>
                                <Badge variant={u.emailVerified ? 'default' : 'secondary'}>
                                    {u.emailVerified ? 'Verified' : 'Unverified'}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <div class="flex flex-wrap gap-1">
                                    {#each userOrgs(u.id) as m (m.id)}
                                        <Badge variant="outline" class="text-xs">{m.orgName}</Badge>
                                    {/each}
                                </div>
                            </Table.Cell>
                            <Table.Cell class="text-muted-foreground text-sm">{formatDate(u.createdAt)}</Table.Cell>
                            <Table.Cell>
                                {#if u.isDev}
                                    <Badge variant="default" class="text-xs">Dev</Badge>
                                {/if}
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        </div>
    {/if}

    <!-- Organizations -->
    {#if tab === 'organizations'}
        <div class="space-y-5">
            <div class="rounded-lg border bg-card p-5">
                <h2 class="text-sm font-semibold mb-3">Create Organization</h2>
                <form
                    method="POST"
                    action="?/createOrg"
                    class="flex gap-2"
                    use:enhance={() => async ({ update }) => { newOrgName = ''; await update(); }}
                >
                    <Input name="name" placeholder="Organization name" bind:value={newOrgName} class="max-w-xs" required />
                    <Button type="submit" size="sm" disabled={!newOrgName.trim()}>Create</Button>
                </form>
                {#if form?.createOrgError}
                    <p class="text-destructive text-sm mt-2">{form.createOrgError}</p>
                {/if}
            </div>

            {#each data.organizations as org (org.id)}
                <div class="rounded-lg border bg-card overflow-hidden">
                    <button
                        class="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-accent/50 transition-colors"
                        onclick={() => selectedOrgId = selectedOrgId === org.id ? null : org.id}
                    >
                        <div>
                            <span class="font-medium text-sm">{org.name}</span>
                            <span class="ml-2 text-xs text-muted-foreground font-mono">{org.slug}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-muted-foreground">{orgMembers(org.id).length} members</span>
                            <span class="text-muted-foreground text-xs">{selectedOrgId === org.id ? '▲' : '▼'}</span>
                        </div>
                    </button>

                    {#if selectedOrgId === org.id}
                        <Separator />
                        <div class="p-4 space-y-4">
                            {#if orgMembers(org.id).length > 0}
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head>User</Table.Head>
                                            <Table.Head>Email</Table.Head>
                                            <Table.Head>Role</Table.Head>
                                            <Table.Head></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each orgMembers(org.id) as m (m.id)}
                                            {@const currentRole = pendingRoles[m.id] ?? m.role}
                                            <Table.Row>
                                                <Table.Cell class="font-medium text-sm">{m.userName}</Table.Cell>
                                                <Table.Cell class="text-muted-foreground text-sm">{m.userEmail}</Table.Cell>
                                                <Table.Cell>
                                                    <form method="POST" action="?/updateMemberRole" use:enhance class="flex items-center gap-2">
                                                        <input type="hidden" name="memberId" value={m.id} />
                                                        <input type="hidden" name="role" value={currentRole} />
                                                        <Select.Root type="single" value={currentRole} onValueChange={(v) => { pendingRoles[m.id] = v; }}>
                                                            <Select.Trigger size="sm" class="h-7 text-xs w-24">{roleLabel(currentRole)}</Select.Trigger>
                                                            <Select.Content>
                                                                {#each roles as r (r)}
                                                                    <Select.Item value={r} label={r}>{r}</Select.Item>
                                                                {/each}
                                                            </Select.Content>
                                                        </Select.Root>
                                                        {#if currentRole !== m.role}
                                                            <Button type="submit" size="sm" class="h-7 text-xs">Save</Button>
                                                        {/if}
                                                    </form>
                                                </Table.Cell>
                                                <Table.Cell class="text-right">
                                                    <form method="POST" action="?/removeMember" use:enhance>
                                                        <input type="hidden" name="memberId" value={m.id} />
                                                        <Button type="submit" variant="ghost" size="sm" class="h-7 text-xs text-destructive hover:text-destructive">Remove</Button>
                                                    </form>
                                                </Table.Cell>
                                            </Table.Row>
                                        {/each}
                                    </Table.Body>
                                </Table.Root>
                            {:else}
                                <p class="text-sm text-muted-foreground px-1">No members yet.</p>
                            {/if}

                            {#if nonMembers(org.id).length > 0}
                                <form method="POST" action="?/addMember" class="flex gap-2 items-center" use:enhance>
                                    <input type="hidden" name="organizationId" value={org.id} />
                                    <input type="hidden" name="userId" value={getAddMember(org.id).userId} />
                                    <input type="hidden" name="role" value={getAddMember(org.id).role} />
                                    <Select.Root type="single" value={getAddMember(org.id).userId} onValueChange={(v) => { getAddMember(org.id).userId = v; }}>
                                        <Select.Trigger size="sm" class="w-56">{userLabel(getAddMember(org.id).userId)}</Select.Trigger>
                                        <Select.Content>
                                            {#each nonMembers(org.id) as u (u.id)}
                                                <Select.Item value={u.id} label={u.name}>{u.name} ({u.email})</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <Select.Root type="single" value={getAddMember(org.id).role} onValueChange={(v) => { getAddMember(org.id).role = v; }}>
                                        <Select.Trigger size="sm" class="w-28">{roleLabel(getAddMember(org.id).role)}</Select.Trigger>
                                        <Select.Content>
                                            {#each roles as r (r)}
                                                <Select.Item value={r} label={r}>{r}</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <Button type="submit" variant="outline" size="sm">Add</Button>
                                </form>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- Invitations -->
    {#if tab === 'invitations'}
        <div class="space-y-5">
            <div class="rounded-lg border bg-card p-5">
                <h2 class="text-sm font-semibold mb-3">Send Invitation</h2>
                <form
                    method="POST"
                    action="?/invite"
                    class="flex flex-wrap gap-2 items-start"
                    use:enhance={() => async ({ update }) => { inviteEmail = ''; inviteName = ''; await update(); }}
                >
                    <Input type="text" name="name" placeholder="Full name" bind:value={inviteName} class="w-40" />
                    <Input type="email" name="email" placeholder="Email address" bind:value={inviteEmail} class="w-52" required />
                    <input type="hidden" name="organizationId" value={inviteOrgId} />
                    <Select.Root type="single" bind:value={inviteOrgId}>
                        <Select.Trigger class="w-44">{orgLabel(inviteOrgId)}</Select.Trigger>
                        <Select.Content>
                            {#each data.organizations as org (org.id)}
                                <Select.Item value={org.id} label={org.name}>{org.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <input type="hidden" name="role" value={inviteRole} />
                    <Select.Root type="single" bind:value={inviteRole}>
                        <Select.Trigger class="w-28">{roleLabel(inviteRole)}</Select.Trigger>
                        <Select.Content>
                            {#each roles as r (r)}
                                <Select.Item value={r} label={r}>{r}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Button type="submit" size="sm" disabled={!inviteEmail.trim() || !inviteOrgId}>Send Invite</Button>
                </form>
                {#if form?.inviteError}
                    <p class="text-destructive text-sm mt-2">{form.inviteError}</p>
                {/if}
            </div>

            <div class="rounded-lg border bg-card overflow-hidden">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Name</Table.Head>
                            <Table.Head>Email</Table.Head>
                            <Table.Head>Organization</Table.Head>
                            <Table.Head>Role</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head>Expires</Table.Head>
                            <Table.Head></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each data.invitations as inv (inv.id)}
                            <Table.Row>
                                <Table.Cell class="text-sm">{inv.name ?? '—'}</Table.Cell>
                                <Table.Cell class="font-medium text-sm">{inv.email}</Table.Cell>
                                <Table.Cell class="text-muted-foreground text-sm">{inv.orgName}</Table.Cell>
                                <Table.Cell><Badge variant="secondary" class="text-xs">{inv.role ?? 'member'}</Badge></Table.Cell>
                                <Table.Cell>
                                    {@const expired = inv.status === 'pending' && isExpired(inv.expiresAt)}
                                    <Badge variant={inv.status === 'accepted' ? 'default' : expired || inv.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                        {expired ? 'expired' : inv.status}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell class="text-muted-foreground text-sm">{formatDate(inv.expiresAt)}</Table.Cell>
                                <Table.Cell class="text-right">
                                    {#if inv.status === 'pending' && !isExpired(inv.expiresAt)}
                                        <form method="POST" action="?/cancelInvite" use:enhance>
                                            <input type="hidden" name="invitationId" value={inv.id} />
                                            <Button type="submit" variant="ghost" size="sm" class="h-7 text-xs text-destructive hover:text-destructive">Cancel</Button>
                                        </form>
                                    {/if}
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                        {#if data.invitations.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="text-center text-muted-foreground py-8">No invitations yet.</Table.Cell>
                            </Table.Row>
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>
        </div>
    {/if}
</div>

<!-- User edit sheet -->
<Sheet.Root bind:open={sheetOpen}>
    <Sheet.Content side="right" class="flex flex-col gap-0 p-0 w-full sm:max-w-md">
        {#if selectedUser}
            <Sheet.Header class="px-6 py-5 border-b shrink-0">
                <Sheet.Title class="text-base">Edit User</Sheet.Title>
                <Sheet.Description class="text-xs">{selectedUser.email}</Sheet.Description>
            </Sheet.Header>

            <form
                method="POST"
                action="?/updateUser"
                class="flex flex-col flex-1 overflow-hidden"
                use:enhance={() => async ({ update }) => {
                    await update({ reset: false });
                    selectedUser = data.users.find(u => u.id === selectedUser?.id) ?? null;
                    if (selectedUser) openUser(selectedUser);
                    sheetOpen = false;
                }}
            >
                <input type="hidden" name="userId" value={selectedUser.id} />
                <input type="hidden" name="emailVerified" value={String(editEmailVerified)} />
                <input type="hidden" name="isDev" value={String(editIsDev)} />
                <input type="hidden" name="addMembers" value={JSON.stringify(getSavePayload().addMembers)} />
                <input type="hidden" name="removeMembers" value={JSON.stringify(getSavePayload().removeMembers)} />
                <input type="hidden" name="updateMembers" value={JSON.stringify(getSavePayload().updateMembers)} />

                <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    <!-- Name -->
                    <div class="space-y-1.5">
                        <label class="text-sm font-medium" for="edit-name">Name</label>
                        <Input id="edit-name" name="name" bind:value={editName} />
                    </div>

                    <!-- Email verified -->
                    <div class="space-y-1.5">
                        <label class="text-sm font-medium">Email verified</label>
                        <Select.Root type="single" value={String(editEmailVerified)} onValueChange={(v) => editEmailVerified = v === 'true'}>
                            <Select.Trigger class="w-full">{editEmailVerified ? 'Verified' : 'Unverified'}</Select.Trigger>
                            <Select.Content>
                                <Select.Item value="true" label="Verified">Verified</Select.Item>
                                <Select.Item value="false" label="Unverified">Unverified</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <!-- Access level -->
                    <div class="space-y-1.5">
                        <label class="text-sm font-medium">Access level</label>
                        <Select.Root type="single" value={String(editIsDev)} onValueChange={(v) => editIsDev = v === 'true'}>
                            <Select.Trigger class="w-full">{editIsDev ? 'Dev' : 'Standard'}</Select.Trigger>
                            <Select.Content>
                                <Select.Item value="false" label="Standard">Standard</Select.Item>
                                <Select.Item value="true" label="Dev">Dev</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <Separator />

                    <!-- Organizations -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium">Organizations</p>
                            {#if editOrgsAvailable.length > 0}
                                <Button type="button" variant="ghost" size="sm" class="h-7 text-xs" onclick={() => showAddOrg = !showAddOrg}>
                                    {showAddOrg ? '✕ Cancel' : '+ Add'}
                                </Button>
                            {/if}
                        </div>

                        {#if editOrgs.length > 0}
                            <div class="rounded-lg border overflow-hidden">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b bg-muted/40">
                                            <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Organization</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Role</th>
                                            <th class="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each editOrgs as e (e.orgId)}
                                            <tr class="border-b last:border-0">
                                                <td class="px-3 py-2 font-medium">
                                                    {e.orgName}
                                                    {#if e.isNew}<span class="ml-1 text-xs text-muted-foreground">(new)</span>{/if}
                                                </td>
                                                <td class="px-3 py-2">
                                                    <Select.Root type="single" value={e.role} onValueChange={(v) => updateOrgRole(e.orgId, v)}>
                                                        <Select.Trigger size="sm" class="h-7 w-24 text-xs">{roleLabel(e.role)}</Select.Trigger>
                                                        <Select.Content>
                                                            {#each roles as r (r)}
                                                                <Select.Item value={r} label={r}>{r}</Select.Item>
                                                            {/each}
                                                        </Select.Content>
                                                    </Select.Root>
                                                </td>
                                                <td class="px-3 py-2 text-right">
                                                    <button type="button" onclick={() => removeOrgFromEdit(e.orgId)} class="text-xs text-muted-foreground hover:text-destructive transition-colors">✕</button>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else}
                            <p class="text-sm text-muted-foreground">Not in any organization.</p>
                        {/if}

                        {#if showAddOrg && editOrgsAvailable.length > 0}
                            <div class="flex gap-2 items-center rounded-lg border bg-muted/30 p-3">
                                <Select.Root type="single" value={addOrgId} onValueChange={(v) => addOrgId = v}>
                                    <Select.Trigger size="sm" class="flex-1">{orgLabel(addOrgId)}</Select.Trigger>
                                    <Select.Content>
                                        {#each editOrgsAvailable as org (org.id)}
                                            <Select.Item value={org.id} label={org.name}>{org.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                                <Select.Root type="single" value={addOrgRole} onValueChange={(v) => addOrgRole = v}>
                                    <Select.Trigger size="sm" class="w-24">{roleLabel(addOrgRole)}</Select.Trigger>
                                    <Select.Content>
                                        {#each roles as r (r)}
                                            <Select.Item value={r} label={r}>{r}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                                <Button type="button" size="sm" onclick={addOrgToEdit} disabled={!addOrgId}>Add</Button>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="shrink-0 border-t px-6 py-4 flex gap-2 justify-end">
                    <Sheet.Close>
                        <Button type="button" variant="outline" size="sm">Cancel</Button>
                    </Sheet.Close>
                    <Button type="submit" size="sm">Save changes</Button>
                </div>
            </form>
        {/if}
    </Sheet.Content>
</Sheet.Root>
