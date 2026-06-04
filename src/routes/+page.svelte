<script lang="ts">
	import { onMount } from 'svelte';
	let visible = $state(false);
	onMount(() => setTimeout(() => (visible = true), 40));

	const modules = [
		{ symbol: '◈', title: 'Employees', desc: 'Profiles, onboarding, and compliance status' },
		{ symbol: '⬡', title: 'Workstations', desc: 'Device inventory, assignments, and history' },
		{ symbol: '◎', title: 'Audit Log', desc: 'Immutable event trail across all actions' },
		{ symbol: '⊘', title: 'Terminations', desc: 'Offboarding checklists and access revocation' }
	];
</script>

<svelte:head>
	<link rel="preconnect" href="https://api.fontshare.com" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="root" class:visible>
	<nav class="nav">
		<div class="nav-inner">
			<img src="/unifi-black-logo.webp" alt="UniFi" class="logo-img" />
			<a href="/login" class="btn-primary">Sign in</a>
		</div>
	</nav>

	<section class="hero">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>

		<div class="hero-inner">
			<p class="eyebrow">UniFi IT Portal</p>
			<h1 class="hero-title">IT Operations,<br />one place.</h1>
			<p class="hero-body">
				Manage your team's devices, onboarding, and access — with a full audit trail behind every action.
			</p>
			<a href="/login" class="btn-primary large">Sign in to continue</a>

			<div class="modules">
				{#each modules as mod, i}
					<div class="module-card" style="animation-delay: {i * 70}ms">
						<span class="module-symbol">{mod.symbol}</span>
						<div>
							<span class="module-title">{mod.title}</span>
							<span class="module-desc">{mod.desc}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>

<style>
	.root {
		height: 100vh;
		overflow: hidden;
		background: #f5f5f0;
		color: #0a0a0a;
		font-family: 'Satoshi', system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
		display: flex;
		flex-direction: column;
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
		position: relative;
		z-index: 10;
		background: rgba(245, 245, 240, 0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}
	.nav-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 32px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.logo-img {
		height: 22px;
		display: block;
	}

	/* Buttons */
	.btn-primary {
		font-family: 'Satoshi', sans-serif;
		font-weight: 500;
		font-size: 14px;
		color: #fafaf8;
		background: #0a0a0a;
		text-decoration: none;
		padding: 8px 18px;
		border-radius: 8px;
		transition:
			opacity 0.18s,
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.btn-primary:hover {
		opacity: 0.82;
		transform: translateY(-1px);
	}
	.btn-primary.large {
		font-size: 15px;
		padding: 13px 28px;
		border-radius: 10px;
	}

	/* Hero */
	.hero {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 32px;
	}
	.hero-inner {
		position: relative;
		z-index: 2;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 22px;
		width: 100%;
		max-width: 860px;
	}
	.eyebrow {
		font-size: 11.5px;
		font-weight: 500;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: #737373;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.65);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		padding: 6px 14px;
		border-radius: 100px;
		margin: 0;
	}
	.hero-title {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: clamp(42px, 5.5vw, 68px);
		line-height: 0.95;
		letter-spacing: -0.04em;
		color: #0a0a0a;
		margin: 0;
	}
	.hero-body {
		font-size: 16px;
		line-height: 1.65;
		color: #737373;
		max-width: 440px;
		margin: 0;
	}

	/* Module strip */
	.modules {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		width: 100%;
		margin-top: 8px;
	}
	.module-card {
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 14px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		text-align: left;
		box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.06);
		animation: fadeUp 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	.module-symbol {
		font-size: 18px;
		color: #737373;
		line-height: 1;
	}
	.module-title {
		display: block;
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 700;
		font-size: 15px;
		letter-spacing: -0.02em;
		color: #0a0a0a;
		margin-bottom: 3px;
	}
	.module-desc {
		display: block;
		font-size: 12.5px;
		color: #737373;
		line-height: 1.5;
	}

	/* Orbs */
	.orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}
	.orb-1 {
		width: 500px;
		height: 500px;
		top: -160px;
		left: -160px;
		background: radial-gradient(circle, rgba(200, 200, 195, 0.38) 0%, transparent 70%);
	}
	.orb-2 {
		width: 380px;
		height: 380px;
		bottom: -100px;
		right: -120px;
		background: radial-gradient(circle, rgba(180, 180, 175, 0.28) 0%, transparent 70%);
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 700px) {
		.modules {
			grid-template-columns: repeat(2, 1fr);
		}
		.hero-title {
			font-size: 42px;
		}
	}
</style>
