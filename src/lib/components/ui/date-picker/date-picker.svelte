<script lang="ts">
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { CalendarDate, parseDate } from '@internationalized/date';
	import { cn } from '$lib/utils.js';

	let {
		value = $bindable(''),
		name,
		placeholder = 'Select date',
		class: className
	}: {
		value?: string;
		name?: string;
		placeholder?: string;
		class?: string;
	} = $props();

	let open = $state(false);

	function fromString(s: string): CalendarDate | undefined {
		if (!s) return undefined;
		try { return parseDate(s.slice(0, 10)); } catch { return undefined; }
	}

	let calDate = $state<CalendarDate | undefined>(fromString(value));

	$effect(() => {
		if (calDate) {
			const y = calDate.year;
			const m = String(calDate.month).padStart(2, '0');
			const d = String(calDate.day).padStart(2, '0');
			value = `${y}-${m}-${d}`;
		} else {
			value = '';
		}
	});

	const formatted = $derived(
		calDate
			? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
					.format(new Date(calDate.year, calDate.month - 1, calDate.day))
			: null
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={cn(
			'border-input bg-input/30 hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-4xl border px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
			!formatted && 'text-muted-foreground',
			className
		)}
	>
		<span>{formatted ?? placeholder}</span>
		<svg class="text-muted-foreground h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<Calendar
			type="single"
			captionLayout="dropdown"
			bind:value={calDate}
			onValueChange={() => (open = false)}
		/>
	</Popover.Content>
</Popover.Root>

{#if name}
	<input type="hidden" {name} value={value} />
{/if}
