<script lang="ts">
	import { callChunkedAsync, callHealthCheckAsync } from '#lib/client.ts';
	import { VITE_COMMIT_SHA } from '$app/env/public';
	import { onMount, tick } from 'svelte';

	const MAX_INPUTS = 5;
	const MAX_FIELD_LENGTH = 127;

	type InputField = {
		id: number;
		value: string;
	};

	type Fragment = {
		key: string;
		text: string;
	};

	let nextInputId = 1;
	let inputs = $state<InputField[]>([{ id: 0, value: '' }]);
	let chunks = $state<string[]>([]);
	let errorMessage = $state<string | null>(null);
	let isFetching = $state(false);
	let form = $state<HTMLFormElement>();
	let submitButton = $state<HTMLButtonElement>();

	const values = $derived(inputs.map((input) => input.value));
	const canAdd = $derived(inputs.length < MAX_INPUTS && values.every((value) => value !== ''));
	const canRemove = $derived(inputs.length > 1);
	const canSubmit = $derived(!isFetching && values.some((value) => value !== ''));
	const paragraphs = $derived(groupChunks(chunks));
	const isWaiting = $derived(isFetching && chunks.length === 0);

	/**
	 * Groups streamed chunks into paragraphs of fragments. Every chunk (or part of a
	 * chunk split on a blank line) becomes its own fragment so that newly arrived text
	 * can animate individually. Fragments are keyed by chunk and part index so they keep
	 * their DOM identity as the stream grows; existing text is not re-animated.
	 */
	function groupChunks(chunks: string[]): Fragment[][] {
		const paragraphs: Fragment[][] = [];

		chunks.forEach((chunk, chunkIndex) => {
			chunk.split('\n\n').forEach((text, partIndex) => {
				const fragment = { key: `${chunkIndex}:${partIndex}`, text };

				if (partIndex === 0 && paragraphs.length > 0) {
					paragraphs[paragraphs.length - 1].push(fragment);
				} else {
					paragraphs.push([fragment]);
				}
			});
		});

		return paragraphs;
	}

	onMount(() => {
		callHealthCheckAsync()
			.then((response) => {
				if (!response.ok) {
					console.error(`API health check failed with status ${response.status}.`);
				}
			})
			.catch((error: unknown) => {
				console.error('API health check failed.', error);
			});
	});

	const createInput = (value = ''): InputField => ({ id: nextInputId++, value });

	function focusLastInput() {
		tick().then(() => {
			const elements = form?.querySelectorAll('input');
			elements?.[elements.length - 1]?.focus();
		});
	}

	function focusSubmitButton() {
		submitButton?.focus();
	}

	function addField() {
		inputs = [...inputs.filter((input) => input.value !== ''), createInput()];
		focusLastInput();
	}

	function removeField(index: number) {
		if (!canRemove) return;

		const remaining = inputs.filter((input, i) => i !== index && input.value !== '');
		inputs = remaining.length === 0 ? [createInput()] : remaining;
		focusLastInput();
	}

	function reset() {
		inputs = [createInput()];
		chunks = [];
		errorMessage = null;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submit([...values]);
	}

	async function submit(entries: string[]) {
		isFetching = true;
		chunks = [];
		errorMessage = null;

		try {
			await callChunkedAsync({ entries: entries.filter((entry) => entry !== '') }, (segment) => {
				if (segment !== '') chunks.push(segment);
			});
		} catch (error) {
			console.error(error);
			errorMessage = error instanceof Error ? error.message : String(error);
		} finally {
			isFetching = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent, index: number) {
		const input = inputs[index];

		if (input === undefined) return;

		if (event.key === 'Enter') {
			event.preventDefault();
			if (inputs.length >= MAX_INPUTS || input.value === '') {
				focusSubmitButton();
			} else {
				addField();
			}
		} else if (event.key === 'Backspace' && input.value === '') {
			event.preventDefault();
			removeField(index);
		}
	}
</script>

<div class="base-centered">
	<header>
		<h1>UKESMAILGENERATOR</h1>
	</header>

	<main>
		<form action="" onsubmit={handleSubmit} bind:this={form}>
			{#each inputs as input, idx (input.id)}
				<div class="input-row">
					<fieldset disabled={isFetching}>
						<button
							type="button"
							title="Tøm felt"
							aria-label="Tøm felt"
							class="remove symbol nudge-left"
							disabled={isFetching || !canRemove}
							onclick={() => removeField(idx)}
						></button>
						<input
							type="text"
							maxlength={MAX_FIELD_LENGTH}
							name={`text-${idx}`}
							aria-label={`Sak ${idx + 1}`}
							disabled={isFetching}
							onkeydown={(event) => handleKeyDown(event, idx)}
							bind:value={input.value}
						/>
					</fieldset>
				</div>
			{/each}

			{#if inputs.length < MAX_INPUTS}
				<div class="input-row">
					<button
						title="Legg til"
						aria-label="Legg til felt"
						type="button"
						class="add symbol nudge-left"
						disabled={!canAdd || isFetching}
						onclick={addField}
					></button>
				</div>
			{/if}

			<div class="relative-container">
				{#if isWaiting}
					<div class="overlay" role="status">
						<span class="visually-hidden">Venter på svar</span>
						<div class="loader"></div>
					</div>
				{/if}
				<div class="result-box">
					{#each paragraphs as paragraph, paragraphIndex (paragraphIndex)}
						<p>
							{#each paragraph as fragment (fragment.key)}<span>{fragment.text}</span>{/each}
						</p>
					{/each}
				</div>
				{#if errorMessage !== null}
					<div class="error-box" role="alert">
						<code>{errorMessage}</code>
					</div>
				{/if}
			</div>
			<div class="input-row flex-end">
				<button
					type="button"
					title="Tøm alle felt"
					aria-label="Tøm alle felt"
					class="reset"
					disabled={isFetching}
					onclick={reset}
				></button>
				<button
					type="submit"
					id="button-submit"
					class="call"
					disabled={isFetching || !canSubmit}
					bind:this={submitButton}
				>
					Send
				</button>
			</div>
		</form>
	</main>
	<footer>
		<p>Skriv inn opp til fem saker som skal tas opp i ukesmailen.</p>
		<p>
			Ikke inkluder personlig informasjon. Bruk heller forfalsket informasjon som du selv erstatter
			i resultatet.
		</p>
		{#if VITE_COMMIT_SHA !== undefined}
			<div>
				<small>{VITE_COMMIT_SHA}</small>
			</div>
		{/if}
	</footer>
</div>
