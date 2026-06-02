<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	const modules = [
		{
			title: 'Employees',
			description: 'Profiles, onboarding checklists, and compliance status for every team member.',
			stat1: { label: 'Active', value: '24' },
			stat2: { label: 'Onboarding', value: '3' },
			tags: ['EDR Check', 'Access Review', 'Badge'],
			href: '/employees',
			symbol: '◈'
		},
		{
			title: 'Workstations',
			description: 'Device inventory, assignments, configuration history, and full audit trail.',
			stat1: { label: 'Managed', value: '47' },
			stat2: { label: 'Flagged', value: '2' },
			tags: ['Windows', 'macOS', 'Linux'],
			href: '/workstations',
			symbol: '⬡'
		},
		{
			title: 'Orders',
			description: 'Hardware and software procurement from request to fulfillment.',
			stat1: { label: 'Pending', value: '8' },
			stat2: { label: 'Fulfilled', value: '12' },
			tags: ['Hardware', 'Licenses', 'Peripherals'],
			href: '/orders',
			symbol: '◇'
		},
		{
			title: 'Audit Log',
			description: 'Immutable event trail across all system actions and configuration changes.',
			stat1: { label: 'Total Events', value: '1,284' },
			stat2: { label: 'Today', value: '14' },
			tags: ['Access', 'Config', 'Auth Events'],
			href: '/audit',
			symbol: '◎'
		},
		{
			title: 'Terminations',
			description:
				'Auto-generated offboarding checklists. Revoke access, reclaim assets, close accounts.',
			stat1: { label: 'Active', value: '1' },
			stat2: { label: 'Completed', value: '6' },
			tags: ['Access Revoke', 'Asset Return', 'Account Closure'],
			href: '/terminations',
			symbol: '⊘',
			highlight: true
		}
	];

	const activity = [
		{ time: '2m ago', text: 'WS-047 assigned to Jordan Kim', type: 'assign' },
		{ time: '18m ago', text: '"EDR Install" completed — Alex Rivera', type: 'complete' },
		{ time: '1h ago', text: 'Order #ORD-2241 fulfilled — Dell Monitor ×2', type: 'order' },
		{ time: '3h ago', text: 'Termination checklist created — Sarah P.', type: 'terminate' },
		{ time: '5h ago', text: 'New device login detected — morgan@company.com', type: 'audit' }
	];

	onMount(() => {
		setTimeout(() => {
			visible = true;
		}, 40);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://api.fontshare.com" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="root" class:visible>
	<!-- ── Navbar ── -->
	<nav class="nav">
		<div class="nav-inner">
			<div class="logo">
				<span class="logo-mark">⬡</span>
				<span class="logo-text">SysAdmin OS</span>
			</div>
			<div class="nav-actions">
				<a href="/login" class="btn-primary">Sign in</a>
			</div>
		</div>
	</nav>

	<!-- ── Hero ── -->
	<section class="hero">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
		<div class="orb orb-3"></div>

		<div class="hero-inner">
			<div class="hero-badge">Workstation Management Platform</div>
			<h1 class="hero-title">
				Your workspace.<br />
				<em>Under control.</em>
			</h1>
			<p class="hero-body">
				Track devices, manage onboarding, audit every action, and auto-generate termination
				checklists — all from one place.
			</p>
			<div class="hero-cta">
				<a href="/dashboard" class="btn-primary large">Get Started</a>
				<a href="/audit" class="btn-ghost large">View Audit Log →</a>
			</div>
			<div class="hero-pills">
				<span class="pill float-a">24 Employees</span>
				<span class="pill float-b">47 Devices</span>
				<span class="pill float-c">8 Open Orders</span>
				<span class="pill float-d">1,284 Audit Events</span>
			</div>
		</div>
	</section>

	<!-- ── Module Grid ── -->
	<section class="modules">
		<span class="section-label">Core Modules</span>
		<div class="module-grid">
			{#each modules as mod, i}
				<div
					class="module-card"
					class:highlight={mod.highlight}
					style="animation-delay: {i * 90}ms"
				>
					<div class="module-header">
						<span class="module-symbol">{mod.symbol}</span>
						<span class="module-title">{mod.title}</span>
					</div>
					<p class="module-desc">{mod.description}</p>
					<div class="module-stats">
						<div class="stat">
							<span class="stat-value">{mod.stat1.value}</span>
							<span class="stat-label">{mod.stat1.label}</span>
						</div>
						<div class="stat-divider"></div>
						<div class="stat">
							<span class="stat-value">{mod.stat2.value}</span>
							<span class="stat-label">{mod.stat2.label}</span>
						</div>
					</div>
					<div class="module-tags">
						{#each mod.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Recent Activity ── -->
	<section class="activity">
		<div class="activity-inner">
			<div class="activity-header">
				<span class="section-label">Recent Activity</span>
				<p class="activity-subtext">A live feed of actions, assignments, and alerts across your entire environment.</p>
			</div>
			<div class="activity-list">
				{#each activity as item, i}
					<div class="activity-item" style="animation-delay: {i * 70}ms">
						<span class="activity-dot dot-{item.type}"></span>
						<span class="activity-text">{item.text}</span>
						<span class="activity-time">{item.time}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ── Footer ── -->
	<footer class="footer">
		<span class="footer-logo">⬡ SysAdmin OS</span>
		<span class="footer-copy">IT Operations Platform</span>
	</footer>
</div>

<style>
	/* ── Root entrance (spring) ── */
	.root {
		min-height: 100vh;
		background: #fafaf8;
		color: #0a0a0a;
		font-family: 'Satoshi', system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
		opacity: 0;
		transform: translateY(14px);
		transition:
			opacity 0.65s cubic-bezier(0.34, 1.2, 0.64, 1),
			transform 0.65s cubic-bezier(0.34, 1.2, 0.64, 1);
	}
	.root.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* ── Navbar ── */
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
		gap: 40px;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 9px;
		flex-shrink: 0;
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
	.nav-links {
		display: flex;
		gap: 28px;
		flex: 1;
	}
	.nav-links a {
		font-size: 14px;
		font-weight: 500;
		color: #737373;
		text-decoration: none;
		transition: color 0.18s;
	}
	.nav-links a:hover {
		color: #0a0a0a;
	}
	.nav-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		margin-left: auto;
	}

	/* ── Buttons ── */
	.btn-ghost {
		font-family: 'Satoshi', sans-serif;
		font-weight: 500;
		font-size: 14px;
		color: #0a0a0a;
		text-decoration: none;
		padding: 8px 16px;
		border-radius: 8px;
		transition: background 0.18s;
	}
	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	.btn-ghost.large {
		font-size: 15px;
		padding: 13px 24px;
	}

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

	/* ── Hero ── */
	.hero {
		position: relative;
		overflow: hidden;
		background: #f5f5f0;
		height: calc(100vh - 64px);
		padding: 0 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hero-inner {
		position: relative;
		z-index: 2;
		max-width: 680px;
		text-align: center;
	}
	.hero-badge {
		display: inline-block;
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
		margin-bottom: 32px;
	}
	.hero-title {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: clamp(52px, 7.5vw, 88px);
		line-height: 0.9;
		letter-spacing: -0.04em;
		color: #0a0a0a;
		margin-bottom: 24px;
	}
	.hero-title em {
		font-style: normal;
		color: #737373;
	}
	.hero-body {
		font-size: 17px;
		line-height: 1.65;
		color: #737373;
		max-width: 460px;
		margin: 0 auto 40px;
	}
	.hero-cta {
		display: flex;
		gap: 10px;
		justify-content: center;
		margin-bottom: 56px;
	}

	/* ── Floating pills ── */
	.hero-pills {
		display: flex;
		gap: 8px;
		justify-content: center;
		flex-wrap: wrap;
	}
	.pill {
		font-size: 13px;
		font-weight: 500;
		color: #0a0a0a;
		background: rgba(255, 255, 255, 0.65);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 100px;
		padding: 8px 18px;
		box-shadow:
			0 8px 40px -8px rgba(0, 0, 0, 0.08),
			0 0 0 1px rgba(0, 0, 0, 0.02);
	}
	.float-a {
		animation: float-a 10s ease-in-out infinite;
	}
	.float-b {
		animation: float-b 12s ease-in-out infinite 1.2s;
	}
	.float-c {
		animation: float-a 9s ease-in-out infinite 2.5s;
	}
	.float-d {
		animation: float-b 11s ease-in-out infinite 0.6s;
	}

	/* ── Background orbs ── */
	.orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 1;
	}
	.orb-1 {
		width: 500px;
		height: 500px;
		top: -130px;
		left: -140px;
		background: radial-gradient(circle, rgba(200, 200, 195, 0.38) 0%, transparent 70%);
		animation: float-a 14s ease-in-out infinite;
	}
	.orb-2 {
		width: 380px;
		height: 380px;
		bottom: -80px;
		right: -100px;
		background: radial-gradient(circle, rgba(180, 180, 175, 0.28) 0%, transparent 70%);
		animation: float-b 11s ease-in-out infinite 2.2s;
	}
	.orb-3 {
		width: 260px;
		height: 260px;
		top: 35%;
		left: 58%;
		background: radial-gradient(circle, rgba(210, 210, 205, 0.22) 0%, transparent 70%);
		animation: float-a 8s ease-in-out infinite 4s;
	}

	/* ── Float keyframes ── */
	@keyframes float-a {
		0%,
		100% {
			transform: translateY(0px) rotate(0deg);
		}
		33% {
			transform: translateY(-20px) rotate(1deg);
		}
		66% {
			transform: translateY(-10px) rotate(-1deg);
		}
	}
	@keyframes float-b {
		0%,
		100% {
			transform: translateY(0px) rotate(0deg);
		}
		33% {
			transform: translateY(-15px) rotate(-2deg);
		}
		66% {
			transform: translateY(-8px) rotate(2deg);
		}
	}

	/* ── Spring card entrance ── */
	@keyframes springIn {
		from {
			opacity: 0;
			transform: translateY(22px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* ── Module section ── */
	.modules {
		max-width: 1200px;
		margin: 0 auto;
		padding: 80px 32px;
	}
	.section-label {
		display: block;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #737373;
		margin-bottom: 20px;
	}

	/* 6-col grid: top row 3×span-2, bottom row 2×span-3 */
	.module-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 14px;
	}
	.module-card {
		grid-column: span 2;
		background: rgba(255, 255, 255, 0.65);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 16px;
		padding: 28px;
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 16px;
		box-shadow:
			0 8px 40px -8px rgba(0, 0, 0, 0.08),
			0 0 0 1px rgba(0, 0, 0, 0.02);
		transition:
			transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.28s ease,
			background 0.2s ease;
		animation: springIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.module-card:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.8);
		box-shadow:
			0 20px 52px -8px rgba(0, 0, 0, 0.11),
			0 0 0 1px rgba(0, 0, 0, 0.04);
	}
	.module-card:nth-child(4),
	.module-card:nth-child(5) {
		grid-column: span 3;
	}
.module-card.highlight {
		background: rgba(10, 10, 10, 0.025);
		border-color: rgba(0, 0, 0, 0.09);
	}

	.module-header {
		display: flex;
		align-items: center;
		gap: 11px;
	}
	.module-symbol {
		font-size: 19px;
		color: #737373;
		line-height: 1;
	}
	.module-title {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 700;
		font-size: 19px;
		letter-spacing: -0.025em;
		color: #0a0a0a;
	}
	.module-desc {
		font-size: 14px;
		line-height: 1.62;
		color: #737373;
		flex: 1;
	}
	.module-stats {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.stat-value {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 26px;
		letter-spacing: -0.035em;
		color: #0a0a0a;
		line-height: 1;
	}
	.stat-label {
		font-size: 12px;
		color: #737373;
		font-weight: 500;
	}
	.stat-divider {
		width: 1px;
		height: 28px;
		background: rgba(0, 0, 0, 0.08);
	}
	.module-tags {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.tag {
		font-size: 11px;
		font-weight: 500;
		color: #737373;
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 100px;
		padding: 4px 10px;
	}

	/* ── Activity ── */
	.activity {
		background: #f5f5f0;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		padding: 64px 32px;
	}
	.activity-inner {
		max-width: 1200px;
		margin: 0 auto;
	}
	.activity-header {
		margin-bottom: 20px;
	}
	.activity-subtext {
		font-size: 14px;
		line-height: 1.62;
		color: #737373;
		margin-top: 6px;
	}
	.view-all {
		font-size: 13px;
		font-weight: 500;
		color: #737373;
		text-decoration: none;
		transition: color 0.18s;
	}
	.view-all:hover {
		color: #0a0a0a;
	}
	.activity-list {
		background: rgba(255, 255, 255, 0.65);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 14px;
		box-shadow:
			0 8px 40px -8px rgba(0, 0, 0, 0.08),
			0 0 0 1px rgba(0, 0, 0, 0.02);
		overflow: hidden;
	}
	.activity-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 15px 24px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
		animation: springIn 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	.activity-item:last-child {
		border-bottom: none;
	}
	.activity-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.dot-assign {
		background: #0a0a0a;
	}
	.dot-complete {
		background: #3d9970;
	}
	.dot-order {
		background: #4a90d9;
	}
	.dot-terminate {
		background: #c0392b;
	}
	.dot-audit {
		background: #737373;
	}
	.activity-text {
		font-size: 14px;
		color: #0a0a0a;
		flex: 1;
	}
	.activity-time {
		font-size: 12px;
		color: #737373;
		white-space: nowrap;
	}

	/* ── Footer ── */
	.footer {
		max-width: 1200px;
		margin: 0 auto;
		padding: 28px 32px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
	}
	.footer-logo {
		font-family: 'Cabinet Grotesk', sans-serif;
		font-weight: 800;
		font-size: 14px;
		letter-spacing: -0.025em;
		color: #0a0a0a;
	}
	.footer-copy {
		font-size: 13px;
		color: #737373;
	}

	/* ── Responsive ── */
	@media (max-width: 900px) {
		.module-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.module-card,
		.module-card:nth-child(4),
		.module-card:nth-child(5) {
			grid-column: span 1;
		}
		.nav-links {
			display: none;
		}
	}
	@media (max-width: 580px) {
		.module-grid {
			grid-template-columns: 1fr;
		}
		.hero-title {
			font-size: 46px;
		}
		.hero-cta {
			flex-direction: column;
			align-items: center;
		}
		.hero-pills {
			gap: 6px;
		}
	}
</style>
