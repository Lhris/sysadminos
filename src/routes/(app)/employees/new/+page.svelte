<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const errors = $derived(form?.errors ?? {});
	const values = $derived(form?.values ?? {});

	let firstName      = $state(form?.values?.firstName ?? '');
	let lastName       = $state(form?.values?.lastName ?? '');
	let microsoftEmail = $state(form?.values?.microsoftEmail ?? '');
	let emailUserEdited = $state(!!form?.values?.microsoftEmail);

	$effect(() => {
		if (!emailUserEdited) {
			const f = firstName.trim().toLowerCase().replace(/\s+/g, '');
			const l = lastName.trim().toLowerCase().replace(/\s+/g, '');
			microsoftEmail = f || l ? `${f}.${l}@unifibooks.com` : '';
		}
	});

	let selectedRole    = $state(form?.values?.role    ?? 'Bookkeeping Specialist');
	let selectedCountry = $state(form?.values?.country ?? 'United States');
	let selectedStatus  = $state(form?.values?.status  ?? 'offer_pending');
	let tempPassword    = $state('');

	function generatePassword() {
		const chars = '0123456789!@#$%';
		const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
		tempPassword = `${lastName || 'Employee'}${suffix}`;
	}

	const roles     = ['Bookkeeping Specialist', 'Bookkeeping Lead'];
	const countries = ['United States', 'Philippines'];
	const statuses  = [
		{ value: 'offer_pending', label: 'Offer Pending' },
		{ value: 'onboarding',    label: 'Onboarding' },
		{ value: 'active',        label: 'Active' },
		{ value: 'offboarding',   label: 'Offboarding' },
		{ value: 'terminated',    label: 'Terminated' }
	];

	function statusLabel(v: string) {
		return statuses.find(s => s.value === v)?.label ?? v;
	}
</script>

<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-9">

	<a href="/employees" class="w-fit text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
		← Back to Employees
	</a>

	<header>
		<h1 class="text-[28px] leading-none tracking-[-0.035em]">Add Employee</h1>
		<p class="mt-[5px] text-[13px] text-muted-foreground">Create a new employee profile and set their initial access details.</p>
	</header>

	<form method="POST" use:enhance class="flex max-w-2xl flex-col gap-5">

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Personal Info</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="firstName" class="text-[13px]">First Name</Label>
						<Input id="firstName" name="firstName" placeholder="Jane"
							bind:value={firstName}
							class={errors.firstName ? 'border-destructive' : ''} />
						{#if errors.firstName}<p class="text-[12px] text-destructive">{errors.firstName}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="lastName" class="text-[13px]">Last Name</Label>
						<Input id="lastName" name="lastName" placeholder="Smith"
							bind:value={lastName}
							class={errors.lastName ? 'border-destructive' : ''} />
						{#if errors.lastName}<p class="text-[12px] text-destructive">{errors.lastName}</p>{/if}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Role</Label>
						<Select.Root type="single" value={selectedRole} onValueChange={(v) => (selectedRole = v)}>
							<Select.Trigger class="w-full {errors.role ? 'border-destructive' : ''}">{selectedRole || 'Select role'}</Select.Trigger>
							<Select.Content>
								{#each roles as r}
									<Select.Item value={r} label={r}>{r}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="role" value={selectedRole} />
						{#if errors.role}<p class="text-[12px] text-destructive">{errors.role}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Country</Label>
						<Select.Root type="single" value={selectedCountry} onValueChange={(v) => (selectedCountry = v)}>
							<Select.Trigger class="w-full {errors.country ? 'border-destructive' : ''}">{selectedCountry || 'Select country'}</Select.Trigger>
							<Select.Content>
								{#each countries as c}
									<Select.Item value={c} label={c}>{c}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="country" value={selectedCountry} />
						{#if errors.country}<p class="text-[12px] text-destructive">{errors.country}</p>{/if}
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Account Details</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<div class="flex flex-col gap-1.5">
					<Label for="microsoftEmail" class="text-[13px]">Microsoft Email</Label>
					<Input id="microsoftEmail" name="microsoftEmail" type="email"
						placeholder="jane.smith@unifibooks.com"
						bind:value={microsoftEmail}
						oninput={() => (emailUserEdited = true)}
						class={errors.microsoftEmail ? 'border-destructive' : ''} />
					{#if errors.microsoftEmail}<p class="text-[12px] text-destructive">{errors.microsoftEmail}</p>{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="personalEmail" class="text-[13px]">
						Personal Email
						<span class="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
					</Label>
					<Input id="personalEmail" name="personalEmail" type="email"
						placeholder="jane@gmail.com" value={values.personalEmail ?? ''} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="address" class="text-[13px]">
						Address
						<span class="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
					</Label>
					<Input id="address" name="address" placeholder="123 Main St, City, State" value={values.address ?? ''} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="tempPassword" class="text-[13px]">
						Temporary Password
						<span class="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
					</Label>
					<div class="flex gap-2">
						<Input id="tempPassword" name="tempPassword" type="text"
							placeholder="Auto-generate or enter manually"
							bind:value={tempPassword}
							class="font-mono text-[13px]" />
						<Button type="button" variant="outline" size="sm" onclick={generatePassword} class="shrink-0">Generate</Button>
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-[15px] font-bold tracking-[-0.02em]">Employment</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">

				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Start Date</Label>
						<DatePicker name="startDate" value={values.startDate?.slice(0,10) ?? ''} class={errors.startDate ? 'border-destructive' : ''} />
						{#if errors.startDate}<p class="text-[12px] text-destructive">{errors.startDate}</p>{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-[13px]">Status</Label>
						<Select.Root type="single" value={selectedStatus} onValueChange={(v) => (selectedStatus = v)}>
							<Select.Trigger class="w-full">{statusLabel(selectedStatus)}</Select.Trigger>
							<Select.Content>
								{#each statuses as s}
									<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="status" value={selectedStatus} />
					</div>
				</div>

			</Card.Content>
		</Card.Root>

		<div class="flex items-center gap-3 pb-4">
			<Button type="submit" size="sm">Add Employee</Button>
			<Button variant="ghost" size="sm" href="/employees">Cancel</Button>
		</div>

	</form>

</main>
