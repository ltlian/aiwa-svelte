<script lang="ts">
	import '../style/theme.css';
	import { callChunkedAsync, callHealthCheckAsync } from '$lib/client';
	import { onMount } from 'svelte';

	const MAX_INPUTS = 5;
	const MAX_FIELD_LENGTH = 127;

	let responseSegments: string[][] = [[]];
	let errorMessage: string | null;

	onMount(() => {
		callHealthCheckAsync()
			.then((e) => {
				if (e.status !== 200) {
					console.error('API responded with non-success.', e);
				}
			})
			.catch((a) => {
				console.error('An error occurred while checking API liveness.');
			});
	});

	const anyContains = (strings: string[]): boolean =>
		strings.findIndex((s) => s.length !== 0) !== -1;

	const anyEmpty = (strings: string[]): boolean => strings.findIndex((s) => s.length === 0) !== -1;

	let inputs: string[] = [''];
	let canAdd: boolean = true;
	let canRemove: boolean = false;
	let canSubmit: boolean = true;
	let isError = false;
	let isFetching: boolean = false;
	let isReading: boolean = false;
	$: canAdd = inputs.length < MAX_INPUTS && !anyEmpty(inputs);
	$: canRemove = inputs.length !== 0;
	$: canSubmit = !isFetching && anyContains(inputs);

	const handleRemoveField = (idx: number) => {
		if (inputs.length > 1) {
			let newOpts = inputs.filter((value, i) => i != idx && value.length != 0);
			inputs = newOpts.length === 0 ? [''] : newOpts.slice();
			focusBottom(2);
		}
	};

	const handleReset = (e: MouseEvent) => {
		inputs = [''];
		isError = false;
		errorMessage = null;
		responseSegments = [];
	};

	const addFieldHandler = (value: string, idx: number) => {
		if (value.length !== 0 && inputs.length < MAX_INPUTS) {
			handleAddField();
		}

		focusBottom(1);
	};

	const handleAddField = () => {
		inputs = [...inputs.filter((x) => x.length != 0), ''];
	};

	function focusBottom(nth: number) {
		let els = document.querySelectorAll<HTMLInputElement>("form input[type='text']");
		let e = els[els.length - nth];
		if (document.contains(e)) {
			e.focus();
		}
	}

	const focusSubmitButton = () =>
		focusAction(document.getElementById('button-submit') as HTMLInputElement);

	const focusAction = (e: HTMLInputElement) => e.focus();

	function handleOnKeyDown(e: any, i: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (inputs.length >= MAX_INPUTS || (inputs[i].length === 0 && inputs.length - 1 >= i)) {
				focusSubmitButton();
			} else {
				addFieldHandler(e.currentTarget.value, i);
			}
		} else if (e.key === 'Backspace' && inputs[i].length === 0) {
			e.preventDefault();
			handleRemoveField(i);
		} else if (e.key !== 'Tab') {
			inputs[i] = e.currentTarget.value;
		}
	}

	function handleOnSubmit(params: string[]) {
		isFetching = true;
		responseSegments = [];
		callChunkedAsync(
			{ entries: params.filter((p) => p?.length > 0) },
			(v) => (responseSegments = appendSegment(responseSegments, v))
		)
			.catch((e: Error) => {
				isError = true;
				errorMessage = e.stack || e.message;
			})
			.finally(() => {
				isFetching = false;
				isReading = false;
			});
	}

	function handleOnSubmit2(params: string[]) {
		isFetching = true;
		// responseSegments = [];
		responseSegments = appendSegment(responseSegments, 'Linje 1\n\nLinje 2\n\nLinje 3');
		isFetching = false;
	}

	/**
	 * Appends the string `v`.
	 * Splits `v` into chunks separated by double newlines.
	 * Appends the first chunk to the last segment, and adds the rest as new segments.
	 *
	 * @param segments - The array of segments which to append `v`.
	 * @param v - The string to append.
	 * @returns New egments with `v` appended.
	 */
	function appendSegment(segments: string[][], v: string): string[][] {
		isReading = true;
		const chunks = v.split('\n\n');
		if (segments.length === 0 || segments[segments.length - 1].length === 0) {
			const len = segments.length - 1;
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				segments[len + i] = [chunk];
			}

			return segments;
		}

		const newSegments = [...segments];
		newSegments[newSegments.length - 1].push(chunks[0]);

		if (chunks.length > 1) {
			// Push remaining chunks as new segments.
			newSegments.push([...chunks.slice(1)]);
		}

		return newSegments;
	}
</script>

<div class="base-centered">
	<header>
		<h1>UKESMAILGENERATOR</h1>
	</header>

	<main>
		<form action="" on:submit|preventDefault={() => handleOnSubmit(inputs)}>
			{#each inputs as opt, idx}
				<div class="input-row">
					<fieldset on:submit|preventDefault disabled={isFetching}>
						<button
							type="button"
							title="Tøm felt"
							class="remove symbol nudge-left"
							disabled={isFetching || inputs.length <= 1}
							on:click={() => handleRemoveField(idx)}
						/>
						<input
							type="text"
							maxlength={MAX_FIELD_LENGTH}
							name="text-{0}"
							disabled={isFetching}
							on:keydown={(e) => handleOnKeyDown(e, idx)}
							bind:value={opt}
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
						on:click={handleAddField}
					/>
				</div>
			{/if}

			<div class="relative-container">
				{#if isFetching && !isReading}
					<div class="overlay">
						<div class="loader" />
					</div>
				{/if}
				<div class="result-box">
					{#each responseSegments as par}
						<p>
							{#each par as sp}
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
					on:click|preventDefault={handleReset}
				/>
				<button type="submit" id="button-submit" class="call" disabled={isFetching || !canSubmit}
					>Send</button
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
