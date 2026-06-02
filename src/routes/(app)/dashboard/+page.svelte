<script lang="ts">
    let { data } = $props();
</script>

<div class="p-8">
    <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
    <p class="text-sm text-muted-foreground mt-1">Welcome back, {data.user.name}.</p>
    <p class="text-xs text-muted-foreground mt-2">isDev: {String(data.isDev)}</p>
</div>
