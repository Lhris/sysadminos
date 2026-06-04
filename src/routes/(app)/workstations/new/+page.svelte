<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const errors = $derived(form?.errors ?? {});
	const values = $derived(form?.values ?? {});

	const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/workstations" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Workstations
	</a>

	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Add Workstation</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">Register a new device by serial number.</p>
	</header>

	<form method="POST" use:enhance class="flex max-w-2xl flex-col gap-5">

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Device</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<div class="flex flex-col gap-1.5">
					<Label for="serialNumber" class="text-[13px]">Serial Number</Label>
					<Input id="serialNumber" name="serialNumber" placeholder="C02XY1234AB" value={values.serialNumber ?? ''} class="font-mono {errors.serialNumber ? 'border-destructive' : ''}" />
					{#if errors.serialNumber}<p class="text-[12px] text-destructive">{errors.serialNumber}</p>{/if}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="make" class="text-[13px]">Make</Label>
						<Input id="make" name="make" placeholder="Apple" value={values.make ?? ''} class={errors.make ? 'border-destructive' : ''} />
						{#if errors.make}<p class="text-[12px] text-destructive">{errors.make}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="model" class="text-[13px]">Model</Label>
						<Input id="model" name="model" placeholder='MacBook Pro 14"' value={values.model ?? ''} class={errors.model ? 'border-destructive' : ''} />
						{#if errors.model}<p class="text-[12px] text-destructive">{errors.model}</p>{/if}
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="deviceType" class="text-[13px]">Type</Label>
					<select id="deviceType" name="deviceType" class="{selectClass} {errors.deviceType ? 'border-destructive' : ''}">
						<option value="" disabled selected={!values.deviceType}>Select type</option>
						<option value="laptop"  selected={values.deviceType === 'laptop'}>Laptop</option>
						<option value="desktop" selected={values.deviceType === 'desktop'}>Desktop</option>
						<option value="monitor" selected={values.deviceType === 'monitor'}>Monitor</option>
						<option value="other"   selected={values.deviceType === 'other'}>Other</option>
					</select>
					{#if errors.deviceType}<p class="text-[12px] text-destructive">{errors.deviceType}</p>{/if}
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">
					Specs
					<span class="ml-1.5 text-[12px] font-normal text-muted-foreground">Optional</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<div class="grid grid-cols-3 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="cpu" class="text-[13px]">CPU</Label>
						<Input id="cpu" name="cpu" placeholder="M3 Pro" value={values.cpu ?? ''} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="ram" class="text-[13px]">RAM</Label>
						<Input id="ram" name="ram" placeholder="16GB" value={values.ram ?? ''} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="os" class="text-[13px]">OS</Label>
						<Input id="os" name="os" placeholder="macOS 15" value={values.os ?? ''} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">
					Details
					<span class="ml-1.5 text-[12px] font-normal text-muted-foreground">Optional</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="orderDate" class="text-[13px]">Order Date</Label>
						<Input id="orderDate" name="orderDate" type="date" value={values.orderDate ?? ''} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="warrantyExpiry" class="text-[13px]">Warranty Expiry</Label>
						<Input id="warrantyExpiry" name="warrantyExpiry" type="date" value={values.warrantyExpiry ?? ''} />
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="location" class="text-[13px]">Location</Label>
					<Input id="location" name="location" placeholder="New York Office" value={values.location ?? ''} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="notes" class="text-[13px]">Notes</Label>
					<textarea
						id="notes" name="notes" rows="3"
						placeholder="Any additional notes..."
						class="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13.5px] text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					>{values.notes ?? ''}</textarea>
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Status</Card.Title>
			</Card.Header>
			<Card.Content>
				<select name="status" class={selectClass}>
					<option value="available" selected={!values.status || values.status === 'available'}>Available</option>
					<option value="in_repair" selected={values.status === 'in_repair'}>In Repair</option>
					<option value="flagged"   selected={values.status === 'flagged'}>Flagged</option>
					<option value="retired"   selected={values.status === 'retired'}>Retired</option>
				</select>
			</Card.Content>
		</Card.Root>

		<div class="flex items-center gap-3 pb-4">
			<Button type="submit" size="sm">Add Workstation</Button>
			<Button variant="ghost" size="sm" href="/workstations">Cancel</Button>
		</div>

	</form>

</main>
