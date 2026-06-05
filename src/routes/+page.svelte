<script lang="ts">
	import { callChunkedAsync, callHealthCheckAsync } from '$lib/client';
	import { onMount, tick } from 'svelte';
	import '../style/theme.css';

	const MAX_INPUTS = 5;
	const MAX_FIELD_LENGTH = 127;

	type InputField = {
		id: number;
		value: string;
	};

	let nextInputId = 1;
	let responseSegments = $state<string[][]>([[]]);
	let errorMessage = $state<string | null>(null);
	let inputs = $state<InputField[]>([{ id: 0, value: '' }]);
	let inputElements = $state<HTMLInputElement[]>([]);
	let submitButton = $state<HTMLButtonElement>();
	let isError = $state(false);
	let isFetching = $state(false);
	let isReading = $state(false);

	const anyContains = (strings: string[]): boolean => strings.some((s) => s.length !== 0);

	const anyEmpty = (strings: string[]): boolean => strings.some((s) => s.length === 0);

	const inputValues = $derived(inputs.map((input) => input.value));
	const canAdd = $derived(inputs.length < MAX_INPUTS && !anyEmpty(inputValues));
	const canRemove = $derived(inputs.length > 1);
	const canSubmit = $derived(!isFetching && anyContains(inputValues));

	const createInput = (value = ''): InputField => ({ id: nextInputId++, value });

	onMount(() => {
		callHealthCheckAsync()
			.then((response) => {
				if (response.status !== 200) {
					console.error('API responded with non-success.', response);
				}
			})
			.catch(() => {
				console.error('An error occurred while checking API liveness.');
			});
	});

	const handleRemoveField = (idx: number) => {
		if (canRemove) {
			const newInputs = inputs.filter((input, i) => i !== idx && input.value.length !== 0);
			inputs = newInputs.length === 0 ? [createInput()] : [...newInputs];
			focusBottom();
		}
	};

	const handleReset = () => {
		inputs = [createInput()];
		isError = false;
		errorMessage = null;
		responseSegments = [];
	};

	const addFieldHandler = (value: string) => {
		if (value.length !== 0 && inputs.length < MAX_INPUTS) {
			handleAddField();
		}

		focusBottom();
	};

	const handleAddField = () => {
		inputs = [...inputs.filter((input) => input.value.length !== 0), createInput()];
	};

	function focusBottom() {
		tick().then(() => inputElements[inputElements.length - 1]?.focus());
	}

	const focusSubmitButton = () => submitButton?.focus();

	const focusAction = (element: HTMLElement) => element.focus();

	function handleOnSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitInputs([...inputValues]);
	}

	function handleOnKeyDown(event: KeyboardEvent, idx: number) {
		const input = event.currentTarget as HTMLInputElement;
		const currentInput = inputs[idx];

		if (currentInput === undefined) {
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			if (
				inputs.length >= MAX_INPUTS ||
				(currentInput.value.length === 0 && inputs.length - 1 >= idx)
			) {
				focusSubmitButton();
			} else {
				addFieldHandler(input.value);
			}
		} else if (event.key === 'Backspace' && currentInput.value.length === 0) {
			event.preventDefault();
			handleRemoveField(idx);
		}
	}

	function submitInputs(params: string[]) {
		isFetching = true;
		isError = false;
		errorMessage = null;
		isReading = false;
		responseSegments = [];
		callChunkedAsync(
			{ entries: params.filter((p) => p?.length > 0) },
			(v) => (responseSegments = appendSegment(responseSegments, v))
		)
			.catch((error: unknown) => {
				isError = true;
				errorMessage = error instanceof Error ? error.stack || error.message : String(error);
			})
			.finally(() => {
				isFetching = false;
				isReading = false;
			});
	}

	/**
	 * Appends the string `v`.
	 * Splits `v` into chunks separated by double newlines.
	 * Appends the first chunk to the last segment, and adds the rest as new segments.
	 *
	 * @param segments - The array of segments which to append `v`.
	 * @param v - The string to append.
	 * @returns New segments with `v` appended.
	 */
	function appendSegment(segments: string[][], v: string): string[][] {
		isReading = true;
		const chunks = v.split('\n\n');
		const lastSegment = segments[segments.length - 1];

		if (lastSegment === undefined || lastSegment.length === 0) {
			const previousSegments = lastSegment === undefined ? segments : segments.slice(0, -1);

			return [...previousSegments, ...chunks.map((chunk) => [chunk])];
		}

		const [firstChunk, ...remainingChunks] = chunks;

		return [
			...segments.slice(0, -1),
			[...lastSegment, firstChunk],
			...remainingChunks.map((chunk) => [chunk])
		];
	}
</script>

<div class="base-centered">
	<header>
		<h1>UKESMAILGENERATOR</h1>
	</header>

	<main>
		<form action="" onsubmit={handleOnSubmit}>
			{#each inputs as input, idx (input.id)}
				<div class="input-row">
					<fieldset disabled={isFetching}>
						<button
							type="button"
							title="Tøm felt"
							class="remove symbol nudge-left"
							disabled={isFetching || !canRemove}
							onclick={() => handleRemoveField(idx)}
						></button>
						<input
							type="text"
							maxlength={MAX_FIELD_LENGTH}
							name={`text-${idx}`}
							disabled={isFetching}
							onkeydown={(event) => handleOnKeyDown(event, idx)}
							bind:value={input.value}
							bind:this={inputElements[idx]}
							use:focusAction
						/>
					</fieldset>
				</div>
			{/each}

			{#if inputs.length < MAX_INPUTS}
				<div class="input-row">
					<button
						title="Legg til"
						type="button"
						class="add symbol nudge-left"
						disabled={!canAdd || isFetching}
						onclick={handleAddField}
					></button>
				</div>
			{/if}

			<div class="relative-container">
				{#if isFetching && !isReading}
					<div class="overlay">
						<div class="loader"></div>
					</div>
				{/if}
				<div class="result-box">
					{#each responseSegments as par, parIdx (parIdx)}
						<p>
							{#each par as sp, spIdx (spIdx)}
								<span>{sp}</span>
							{/each}
						</p>
					{/each}
				</div>
				{#if isError}
					<div class="error-box">
						<code>
							{errorMessage}
						</code>
					</div>
				{/if}
			</div>
			<div class="input-row flex-end">
				<button
					type="button"
					title="Tøm alle felt"
					class="reset"
					disabled={isFetching}
					onclick={handleReset}
				></button>
				<button
					type="submit"
					id="button-submit"
					class="call"
					disabled={isFetching || !canSubmit}
					bind:this={submitButton}>Send</button
				>
			</div>
		</form>
	</main>
	<footer>
		<p>Skriv inn opp til fem saker som skal tas opp i ukesmailen.</p>
		<p>
			Ikke inkluder personlig informasjon. Bruk heller forfalsket informasjon som du selv erstatter
			i resultatet.
		</p>
		{#if import.meta.env.VITE_COMMIT_SHA !== undefined}
			<div>
				<small>{import.meta.env.VITE_COMMIT_SHA}</small>
			</div>
		{/if}
	</footer>
</div>
