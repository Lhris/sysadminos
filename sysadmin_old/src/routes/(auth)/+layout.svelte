<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://api.fontshare.com" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="auth-root">
	<div class="orb orb-1"></div>
	<div class="orb orb-2"></div>
	{@render children()}
</div>

<style>
	.auth-root {
		min-height: 100vh;
		background: #f5f5f0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 16px;
		position: relative;
		overflow: hidden;
		font-family: 'Satoshi', system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 0;
	}
	.orb-1 {
		width: 600px;
		height: 600px;
		top: -180px;
		left: -180px;
		background: radial-gradient(circle, rgba(200, 200, 195, 0.38) 0%, transparent 70%);
		animation: float-a 14s ease-in-out infinite;
	}
	.orb-2 {
		width: 400px;
		height: 400px;
		bottom: -100px;
		right: -120px;
		background: radial-gradient(circle, rgba(180, 180, 175, 0.28) 0%, transparent 70%);
		animation: float-b 11s ease-in-out infinite 2.2s;
	}

	@keyframes float-a {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		33%       { transform: translateY(-20px) rotate(1deg); }
		66%       { transform: translateY(-10px) rotate(-1deg); }
	}
	@keyframes float-b {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		33%       { transform: translateY(-15px) rotate(-2deg); }
		66%       { transform: translateY(-8px) rotate(2deg); }
	}
</style>
