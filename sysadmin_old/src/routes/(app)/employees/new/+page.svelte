<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const errors  = $derived(form?.errors  ?? {});
	const values  = $derived(form?.values  ?? {});

	let tempPassword = $state(values.tempPassword ?? '');

	function generatePassword() {
		const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
		tempPassword = Array.from(
			{ length: 14 },
			() => chars[Math.floor(Math.random() * chars.length)]
		).join('');
	}

	const countries = [
		'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
		'France', 'Netherlands', 'Singapore', 'Japan', 'India', 'Brazil',
		'Mexico', 'Spain', 'Italy', 'Sweden', 'Norway', 'Denmark', 'Poland',
		'South Korea', 'New Zealand', 'Other'
	];
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<!-- Back -->
	<a href="/employees" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Employees
	</a>

	<!-- Header -->
	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Add Employee</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">
			Create a new employee profile and set their initial access details.
		</p>
	</header>

	<!-- Form -->
	<form method="POST" use:enhance class="flex max-w-2xl flex-col gap-5">

		<Card.Root>
			<Card.Header>
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
					Personal Info
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<!-- First + Last name -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="firstName" class="text-[13px]">First Name</Label>
						<Input
							id="firstName"
							name="firstName"
							placeholder="Jane"
							value={values.firstName ?? ''}
							class={errors.firstName ? 'border-destructive' : ''}
						/>
						{#if errors.firstName}
							<p class="text-[12px] text-destructive">{errors.firstName}</p>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="lastName" class="text-[13px]">Last Name</Label>
						<Input
							id="lastName"
							name="lastName"
							placeholder="Smith"
							value={values.lastName ?? ''}
							class={errors.lastName ? 'border-destructive' : ''}
						/>
						{#if errors.lastName}
							<p class="text-[12px] text-destructive">{errors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Role + Country -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="role" class="text-[13px]">Role</Label>
						<Input
							id="role"
							name="role"
							placeholder="Software Engineer"
							value={values.role ?? ''}
							class={errors.role ? 'border-destructive' : ''}
						/>
						{#if errors.role}
							<p class="text-[12px] text-destructive">{errors.role}</p>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="country" class="text-[13px]">Country</Label>
						<select
							id="country"
							name="country"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring {errors.country ? 'border-destructive' : ''}"
						>
							<option value="" disabled selected={!values.country}>Select country</option>
							{#each countries as c}
								<option value={c} selected={values.country === c}>{c}</option>
							{/each}
						</select>
						{#if errors.country}
							<p class="text-[12px] text-destructive">{errors.country}</p>
						{/if}
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
					Account Details
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<!-- Microsoft email -->
				<div class="flex flex-col gap-1.5">
					<Label for="microsoftEmail" class="text-[13px]">Microsoft Email</Label>
					<Input
						id="microsoftEmail"
						name="microsoftEmail"
						type="email"
						placeholder="jane.smith@company.com"
						value={values.microsoftEmail ?? ''}
						class={errors.microsoftEmail ? 'border-destructive' : ''}
					/>
					{#if errors.microsoftEmail}
						<p class="text-[12px] text-destructive">{errors.microsoftEmail}</p>
					{/if}
				</div>

				<!-- Personal email -->
				<div class="flex flex-col gap-1.5">
					<Label for="personalEmail" class="text-[13px]">
						Personal Email
						<span class="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
					</Label>
					<Input
						id="personalEmail"
						name="personalEmail"
						type="email"
						placeholder="jane@gmail.com"
						value={values.personalEmail ?? ''}
					/>
				</div>

				<!-- Temp password -->
				<div class="flex flex-col gap-1.5">
					<Label for="tempPassword" class="text-[13px]">
						Temporary Password
						<span class="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
					</Label>
					<div class="flex gap-2">
						<Input
							id="tempPassword"
							name="tempPassword"
							type="text"
							placeholder="Auto-generate or enter manually"
							bind:value={tempPassword}
							class="font-mono text-[13px]"
						/>
						<Button type="button" variant="outline" size="sm" onclick={generatePassword} class="shrink-0">
							Generate
						</Button>
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="font-heading text-[15px] font-bold tracking-[-0.02em]">
					Employment
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<!-- Start date + Status -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="startDate" class="text-[13px]">Start Date</Label>
						<Input
							id="startDate"
							name="startDate"
							type="date"
							value={values.startDate ?? ''}
							class={errors.startDate ? 'border-destructive' : ''}
						/>
						{#if errors.startDate}
							<p class="text-[12px] text-destructive">{errors.startDate}</p>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="status" class="text-[13px]">Status</Label>
						<select
							id="status"
							name="status"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13.5px] text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
						>
							<option value="onboarding" selected={!values.status || values.status === 'onboarding'}>Onboarding</option>
							<option value="active"      selected={values.status === 'active'}>Active</option>
							<option value="offboarding" selected={values.status === 'offboarding'}>Offboarding</option>
							<option value="terminated"  selected={values.status === 'terminated'}>Terminated</option>
						</select>
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<!-- Actions -->
		<div class="flex items-center gap-3 pb-4">
			<Button type="submit" size="sm">Add Employee</Button>
			<Button variant="ghost" size="sm" href="/employees">Cancel</Button>
		</div>

	</form>

</main>
