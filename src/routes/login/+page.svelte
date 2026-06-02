<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authClient } from '$lib/auth-client';

	let step = $state<'email' | 'otp'>('email');
	let email = $state('');
	let otp = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let visible = $state(false);

	onMount(() => {
		setTimeout(() => (visible = true), 40);
	});

	async function sendOtp() {
		if (!email.trim() || loading) return;
		loading = true;
		error = null;

		const { error: err } = await authClient.emailOtp.sendVerificationOtp({
			email: email.trim(),
			type: 'sign-in'
		});

		loading = false;
		if (err) {
			error = err.message ?? 'Failed to send code. Try again.';
			return;
		}
		step = 'otp';
	}

	async function signIn() {
		if (otp.trim().length < 6 || loading) return;
		loading = true;
		error = null;

		const { error: err } = await authClient.signIn.emailOtp({
			email: email.trim(),
			otp: otp.trim()
		});

		loading = false;
		if (err) {
			error = err.message ?? 'Invalid or expired code.';
			return;
		}
		goto('/dashboard');
	}

	function back() {
		step = 'email';
		otp = '';
		error = null;
	}

	function handleEmailKey(e: KeyboardEvent) {
		if (e.key === 'Enter') sendOtp();
	}

	function handleOtpKey(e: KeyboardEvent) {
		if (e.key === 'Enter') signIn();
	}
</script>

<svelte:head>
	<title>Sign in — SysAdmin OS</title>
	<link rel="preconnect" href="https://api.fontshare.com" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap"
		rel="stylesheet"
	/>
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
			{#if step === 'email'}
				<div class="card-header">
					<h1 class="card-title">Welcome back</h1>
					<p class="card-sub">Enter your email to receive a sign-in code.</p>
				</div>

				<div class="fields">
					<div class="field">
						<label class="label" for="email">Email address</label>
						<input
							id="email"
							class="input"
							type="email"
							placeholder="you@company.com"
							bind:value={email}
							onkeydown={handleEmailKey}
							autocomplete="email"
							disabled={loading}
						/>
					</div>

					{#if error}
						<p class="error">{error}</p>
					{/if}

					<button class="btn-primary" onclick={sendOtp} disabled={!email.trim() || loading}>
						{#if loading}
							<span class="spinner"></span>Sending…
						{:else}
							Continue →
						{/if}
					</button>
				</div>

			{:else}
				<div class="card-header">
					<div class="otp-icon">✉</div>
					<h1 class="card-title">Check your email</h1>
					<p class="card-sub">
						We sent a 6-digit code to <strong>{email}</strong>
					</p>
				</div>

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
							onkeydown={handleOtpKey}
							autocomplete="one-time-code"
							disabled={loading}
						/>
					</div>

					{#if error}
						<p class="error">{error}</p>
					{/if}

					<button
						class="btn-primary"
						onclick={signIn}
						disabled={otp.trim().length < 6 || loading}
					>
						{#if loading}
							<span class="spinner"></span>Signing in…
						{:else}
							Sign in
						{/if}
					</button>

					<button class="btn-ghost" onclick={back} disabled={loading}>
						← Use a different email
					</button>
				</div>
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
		transition:
			opacity 0.55s cubic-bezier(0.34, 1.2, 0.64, 1),
			transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1);
	}
	.root.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Nav */
	.nav {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(250, 250, 248, 0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
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
	.logo {
		display: flex;
		align-items: center;
		gap: 9px;
		text-decoration: none;
	}
	.logo-mark {
		font-size: 19px;
		line-height: 1;
		color: #0a0a0a;
	}
	.logo-text {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 15px;
		letter-spacing: -0.03em;
		color: #0a0a0a;
	}

	/* Main */
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

	/* Orbs */
	.orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}
	.orb-1 {
		width: 480px;
		height: 480px;
		top: -160px;
		left: -160px;
		background: radial-gradient(circle, rgba(200, 200, 195, 0.35) 0%, transparent 70%);
		animation: float-a 14s ease-in-out infinite;
	}
	.orb-2 {
		width: 340px;
		height: 340px;
		bottom: -100px;
		right: -100px;
		background: radial-gradient(circle, rgba(180, 180, 175, 0.25) 0%, transparent 70%);
		animation: float-b 11s ease-in-out infinite 2s;
	}

	@keyframes float-a {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-20px);
		}
	}
	@keyframes float-b {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-14px);
		}
	}

	/* Card */
	.card {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 400px;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(0, 0, 0, 0.07);
		border-radius: 20px;
		padding: 40px 36px;
		box-shadow:
			0 16px 56px -12px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(0, 0, 0, 0.02);
		animation: springIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes springIn {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.card-header {
		margin-bottom: 28px;
	}
	.otp-icon {
		font-size: 28px;
		margin-bottom: 12px;
	}
	.card-title {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 26px;
		letter-spacing: -0.035em;
		color: #0a0a0a;
		margin-bottom: 6px;
	}
	.card-sub {
		font-size: 14px;
		color: #737373;
		line-height: 1.55;
	}
	.card-sub strong {
		color: #0a0a0a;
		font-weight: 500;
	}

	/* Fields */
	.fields {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 13px;
		font-weight: 500;
		color: #0a0a0a;
	}
	.input {
		width: 100%;
		padding: 11px 14px;
		font-family: 'Satoshi', system-ui, sans-serif;
		font-size: 15px;
		color: #0a0a0a;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 10px;
		outline: none;
		transition:
			border-color 0.18s,
			box-shadow 0.18s;
		box-sizing: border-box;
	}
	.input:focus {
		border-color: rgba(0, 0, 0, 0.3);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
	}
	.input:disabled {
		opacity: 0.5;
	}
	.input::placeholder {
		color: #b0b0b0;
	}
	.otp-input {
		letter-spacing: 0.25em;
		font-size: 20px;
		text-align: center;
		font-weight: 500;
	}

	/* Error */
	.error {
		font-size: 13px;
		color: #c0392b;
		background: rgba(192, 57, 43, 0.06);
		border: 1px solid rgba(192, 57, 43, 0.15);
		border-radius: 8px;
		padding: 10px 13px;
	}

	/* Buttons */
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
		transition:
			opacity 0.18s,
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.btn-primary:hover:not(:disabled) {
		opacity: 0.82;
		transform: translateY(-1px);
	}
	.btn-primary:disabled {
		opacity: 0.38;
		cursor: not-allowed;
		transform: none;
	}

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
		transition:
			color 0.18s,
			background 0.18s;
	}
	.btn-ghost:hover:not(:disabled) {
		color: #0a0a0a;
		background: rgba(0, 0, 0, 0.04);
	}
	.btn-ghost:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Spinner */
	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Fine print */
	.fine-print {
		margin-top: 20px;
		font-size: 12.5px;
		color: #a0a0a0;
		text-align: center;
		line-height: 1.5;
	}
</style>
