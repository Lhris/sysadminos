<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="card">
	<div class="card-header">
		<div class="logo">
			<span class="logo-mark">⬡</span>
			<span class="logo-text">SysAdmin OS</span>
		</div>
		<h1 class="title">Sign in</h1>
		<p class="subtitle">Enter your credentials to continue</p>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<div class="fields">
			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="you@company.com"
					required
					autocomplete="email"
				/>
			</div>
			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					placeholder="••••••••"
					required
					autocomplete="current-password"
					minlength="8"
				/>
			</div>
			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</div>
	</form>

	<p class="footer-text">
		Don't have an account?
		<a href="/register">Register</a>
	</p>
</div>

<style>
	.card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 380px;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		padding: 36px 32px 28px;
		box-shadow:
			0 8px 40px -8px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(0, 0, 0, 0.02);
		animation: springIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes springIn {
		from { opacity: 0; transform: translateY(22px) scale(0.97); }
		to   { opacity: 1; transform: translateY(0)    scale(1); }
	}

	.card-header {
		margin-bottom: 28px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}
	.logo-mark {
		font-size: 18px;
		line-height: 1;
		color: #0a0a0a;
	}
	.logo-text {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 14px;
		letter-spacing: -0.03em;
		color: #0a0a0a;
	}

	.title {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 28px;
		letter-spacing: -0.04em;
		line-height: 1;
		color: #0a0a0a;
		margin: 0 0 8px;
	}
	.subtitle {
		font-size: 14px;
		color: #737373;
		margin: 0;
	}

	.error {
		background: rgba(192, 57, 43, 0.08);
		border: 1px solid rgba(192, 57, 43, 0.18);
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 13px;
		color: #c0392b;
		margin-bottom: 16px;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 13px;
		font-weight: 500;
		color: #0a0a0a;
	}

	input {
		width: 100%;
		height: 40px;
		padding: 0 12px;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 10px;
		font-family: 'Satoshi', system-ui, sans-serif;
		font-size: 14px;
		color: #0a0a0a;
		outline: none;
		transition: border-color 0.18s, box-shadow 0.18s;
		box-sizing: border-box;
	}
	input::placeholder {
		color: #b0b0b0;
	}
	input:focus {
		border-color: rgba(0, 0, 0, 0.3);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
	}

	.btn-primary {
		width: 100%;
		height: 40px;
		background: #0a0a0a;
		color: #fafaf8;
		border: none;
		border-radius: 10px;
		font-family: 'Satoshi', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		margin-top: 4px;
		transition:
			opacity 0.18s,
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.btn-primary:hover:not(:disabled) {
		opacity: 0.82;
		transform: translateY(-1px);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.footer-text {
		margin: 20px 0 0;
		font-size: 13px;
		color: #737373;
		text-align: center;
	}
	.footer-text a {
		color: #0a0a0a;
		font-weight: 500;
		text-decoration: none;
	}
	.footer-text a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
