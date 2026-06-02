<script lang="ts">
    let { data } = $props();
</script>

<div class="page">
    <h1 class="title">Dashboard</h1>
    <p class="sub">Welcome back, {data.user.name}.</p>
</div>

<style>
    .page {
        padding: 48px;
        font-family: 'Satoshi', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
    }
    .title {
        font-family: 'Cabinet Grotesk', sans-serif;
        font-weight: 800;
        font-size: 28px;
        letter-spacing: -0.035em;
        color: #0a0a0a;
        margin-bottom: 6px;
    }
    .sub {
        font-size: 14px;
        color: #737373;
    }
</style>
