<script lang="ts">
    import { goto } from '$app/navigation';
    import { authClient } from '$lib/auth-client';
    import { onMount } from 'svelte';

    let { data } = $props();

    const inv = data.invitation;

    // OTP sign-in state (for unauthenticated users)
    let step = $state<'email' | 'otp'>('email');
    let email = $state(inv?.email ?? '');
    let otp = $state('');
    let loading = $state(false);
    let error = $state<string | null>(null);
    let visible = $state(false);

    onMount(() => setTimeout(() => (visible = true), 40));

    async function sendOtp() {
        if (!email.trim() || loading) return;
        loading = true;
        error = null;
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({
            email: email.trim(),
            type: 'sign-in'
        });
        loading = false;
        if (err) { error = err.message ?? 'Failed to send code.'; return; }
        step = 'otp';
    }

    async function signInAndAccept() {
        if (otp.trim().length < 6 || loading) return;
        loading = true;
        error = null;
        const { error: signInErr } = await authClient.signIn.emailOtp({
            email: email.trim(),
            otp: otp.trim()
        });
        if (signInErr) {
            loading = false;
            error = signInErr.message ?? 'Invalid or expired code.';
            return;
        }
        await accept();
    }

    async function accept() {
        loading = true;
        error = null;
        const { error: err } = await authClient.organization.acceptInvitation({
            invitationId: inv!.id
        });
        loading = false;
        if (err) { error = err.message ?? 'Failed to accept invitation.'; return; }
        await goto('/dashboard');
    }
</script>

<svelte:head>
    <title>Accept Invitation</title>
    <link rel="preconnect" href="https://api.fontshare.com" />
    <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="root" class:visible>
    <nav class="nav">
        <div class="nav-inner">
            <a href="/" class="logo">
                <span class="logo-mark">⬡</span>
                <span class="logo-text">SysAdmin OS</span>
            </a>
        </div>
    </nav>

    <main class="main">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>

        <div class="card">
            {#if !inv}
                <div class="card-header">
                    <h1 class="card-title">Invalid invitation</h1>
                    <p class="card-sub">This invitation link is invalid or has expired.</p>
                </div>
                <a href="/login" class="btn-primary">Go to sign in</a>

            {:else if inv.status === 'cancelled'}
                <div class="card-header">
                    <h1 class="card-title">Invitation cancelled</h1>
                    <p class="card-sub">This invitation has been cancelled.</p>
                </div>

            {:else if inv.status === 'accepted'}
                <div class="card-header">
                    <h1 class="card-title">Already accepted</h1>
                    <p class="card-sub">This invitation has already been accepted.</p>
                </div>
                <a href="/dashboard" class="btn-primary">Go to dashboard</a>

            {:else if new Date(inv.expiresAt) < new Date()}
                <div class="card-header">
                    <h1 class="card-title">Invitation expired</h1>
                    <p class="card-sub">This invitation has expired. Ask an admin to send a new one.</p>
                </div>

            {:else if data.user}
                <!-- Logged in — show accept UI -->
                <div class="card-header">
                    <div class="invite-icon">⬡</div>
                    <h1 class="card-title">You're invited</h1>
                    <p class="card-sub">
                        Join <strong>{inv.orgName}</strong> as <strong>{inv.role ?? 'member'}</strong>.
                    </p>
                </div>
                {#if error}
                    <p class="error">{error}</p>
                {/if}
                <button class="btn-primary" onclick={accept} disabled={loading}>
                    {#if loading}<span class="spinner"></span>Accepting…{:else}Accept invitation{/if}
                </button>

            {:else}
                <!-- Not logged in — show OTP flow -->
                <div class="card-header">
                    <div class="invite-icon">⬡</div>
                    <h1 class="card-title">You're invited</h1>
                    <p class="card-sub">
                        Join <strong>{inv.orgName}</strong> as <strong>{inv.role ?? 'member'}</strong>.
                        Sign in to accept.
                    </p>
                </div>

                {#if step === 'email'}
                    <div class="fields">
                        <div class="field">
                            <label class="label" for="email">Email address</label>
                            <input
                                id="email"
                                class="input"
                                type="email"
                                bind:value={email}
                                onkeydown={(e) => e.key === 'Enter' && sendOtp()}
                                autocomplete="email"
                                disabled={loading}
                            />
                        </div>
                        {#if error}<p class="error">{error}</p>{/if}
                        <button class="btn-primary" onclick={sendOtp} disabled={!email.trim() || loading}>
                            {#if loading}<span class="spinner"></span>Sending…{:else}Continue →{/if}
                        </button>
                    </div>
                {:else}
                    <div class="fields">
                        <div class="field">
                            <label class="label" for="otp">Verification code</label>
                            <input
                                id="otp"
                                class="input otp-input"
                                type="text"
                                inputmode="numeric"
                                placeholder="000000"
                                maxlength={6}
                                bind:value={otp}
                                onkeydown={(e) => e.key === 'Enter' && signInAndAccept()}
                                autocomplete="one-time-code"
                                disabled={loading}
                            />
                        </div>
                        {#if error}<p class="error">{error}</p>{/if}
                        <button class="btn-primary" onclick={signInAndAccept} disabled={otp.trim().length < 6 || loading}>
                            {#if loading}<span class="spinner"></span>Signing in…{:else}Sign in & accept{/if}
                        </button>
                        <button class="btn-ghost" onclick={() => { step = 'email'; otp = ''; error = null; }} disabled={loading}>
                            ← Use a different email
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </main>
</div>

<style>
    .root {
        min-height: 100vh;
        background: #fafaf8;
        color: #0a0a0a;
        font-family: 'Satoshi', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.55s cubic-bezier(0.34, 1.2, 0.64, 1), transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1);
    }
    .root.visible { opacity: 1; transform: translateY(0); }

    .nav {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(250, 250, 248, 0.8);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .nav-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 32px;
        height: 64px;
        display: flex;
        align-items: center;
    }
    .logo { display: flex; align-items: center; gap: 9px; text-decoration: none; }
    .logo-mark { font-size: 19px; color: #0a0a0a; }
    .logo-text { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: -0.03em; color: #0a0a0a; }

    .main {
        position: relative;
        overflow: hidden;
        background: #f5f5f0;
        min-height: calc(100vh - 64px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
    }
    .orb { position: absolute; border-radius: 50%; pointer-events: none; }
    .orb-1 { width: 480px; height: 480px; top: -160px; left: -160px; background: radial-gradient(circle, rgba(200,200,195,0.35) 0%, transparent 70%); }
    .orb-2 { width: 340px; height: 340px; bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(180,180,175,0.25) 0%, transparent 70%); }

    .card {
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 400px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(24px);
        border: 1px solid rgba(0, 0, 0, 0.07);
        border-radius: 20px;
        padding: 40px 36px;
        box-shadow: 0 16px 56px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .invite-icon { font-size: 28px; margin-bottom: 4px; }
    .card-header { margin-bottom: 4px; }
    .card-title { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.035em; color: #0a0a0a; margin-bottom: 6px; }
    .card-sub { font-size: 14px; color: #737373; line-height: 1.55; }
    .card-sub strong { color: #0a0a0a; font-weight: 500; }

    .fields { display: flex; flex-direction: column; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .label { font-size: 13px; font-weight: 500; color: #0a0a0a; }
    .input {
        width: 100%;
        padding: 11px 14px;
        font-family: 'Satoshi', system-ui, sans-serif;
        font-size: 15px;
        color: #0a0a0a;
        background: rgba(255,255,255,0.8);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 10px;
        outline: none;
        transition: border-color 0.18s, box-shadow 0.18s;
        box-sizing: border-box;
    }
    .input:focus { border-color: rgba(0,0,0,0.3); box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
    .input:disabled { opacity: 0.5; }
    .otp-input { letter-spacing: 0.25em; font-size: 20px; text-align: center; font-weight: 500; }

    .error { font-size: 13px; color: #c0392b; background: rgba(192,57,43,0.06); border: 1px solid rgba(192,57,43,0.15); border-radius: 8px; padding: 10px 13px; }

    .btn-primary {
        width: 100%;
        padding: 12px 20px;
        font-family: 'Satoshi', system-ui, sans-serif;
        font-size: 15px;
        font-weight: 500;
        color: #fafaf8;
        background: #0a0a0a;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-decoration: none;
        transition: opacity 0.18s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.82; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.38; cursor: not-allowed; }

    .btn-ghost {
        width: 100%;
        padding: 10px 20px;
        font-family: 'Satoshi', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #737373;
        background: transparent;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: color 0.18s, background 0.18s;
    }
    .btn-ghost:hover:not(:disabled) { color: #0a0a0a; background: rgba(0,0,0,0.04); }
    .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

    .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>
