<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolveTokens, buildPayload, type AutomationField, type ProfileLike } from '$lib/automation';

	type Auto = { name: string; description?: string | null; url: string; fields: AutomationField[] };

	let {
		open = $bindable(false),
		automation,
		profile,
		action,
		hidden = {}
	}: {
		open?: boolean;
		automation: Auto | null;
		profile: ProfileLike | null;
		action: string;
		hidden?: Record<string, string>;
	} = $props();

	let values = $state<Record<string, string>>({});
	let error = $state('');
	let running = $state(false);
	let wasOpen = false;

	// Re-initialise field values only on the closed→open transition, so editing
	// (or unrelated reactive updates) doesn't wipe what the user typed.
	$effect(() => {
		if (open && !wasOpen && automation && profile) {
			values = Object.fromEntries(automation.fields.map((f) => [f.key, resolveTokens(f.default, profile)]));
			error = '';
		}
		wasOpen = open;
	});

	const payload = $derived(automation ? buildPayload(automation.fields, values) : {});
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="flex flex-col gap-0 p-0 sm:max-w-md">
		<Sheet.Header class="shrink-0 border-b px-6 py-5">
			<Sheet.Title class="text-base">{automation?.name ?? 'Run automation'}</Sheet.Title>
			{#if automation?.description}
				<Sheet.Description class="text-xs">{automation.description}</Sheet.Description>
			{/if}
		</Sheet.Header>

		{#if automation}
			<form
				method="POST"
				{action}
				use:enhance={() => {
					running = true;
					error = '';
					return async ({ result, update }) => {
						running = false;
						if (result.type === 'success') {
							open = false;
						} else if (result.type === 'failure') {
							error = (result.data?.runError as string) ?? 'Something went wrong';
						}
						await update({ reset: false });
					};
				}}
				class="flex flex-1 flex-col overflow-hidden"
			>
				{#each Object.entries(hidden) as [k, v] (k)}
					<input type="hidden" name={k} value={v} />
				{/each}
				<input type="hidden" name="payload" value={JSON.stringify(payload)} />

				<div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
					<div class="flex flex-col gap-1">
						<Label class="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Sends to</Label>
						<p class="break-all font-mono text-[12px] text-muted-foreground">{automation.url}</p>
					</div>

					{#if automation.fields.length === 0}
						<p class="text-[13px] text-muted-foreground">This automation has no fields. An empty payload will be sent.</p>
					{:else}
						{#each automation.fields as field (field.key)}
							<div class="flex flex-col gap-1.5">
								<Label class="text-[13px]">{field.label || field.key}</Label>
								<Input bind:value={values[field.key]} />
							</div>
						{/each}

						<div class="flex flex-col gap-1.5">
							<Label class="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Payload preview</Label>
							<pre class="overflow-x-auto rounded-md border bg-muted/40 p-3 text-[12px] leading-relaxed">{JSON.stringify(payload, null, 2)}</pre>
						</div>
					{/if}

					{#if error}
						<p class="text-[12px] text-destructive">{error}</p>
					{/if}
				</div>

				<div class="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
					<Sheet.Close>
						<Button type="button" variant="outline" size="sm">Cancel</Button>
					</Sheet.Close>
					<Button type="submit" size="sm" disabled={running}>{running ? 'Running…' : 'Run'}</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
