import './style/theme.css';
import { callChunked, callHealthCheck } from './client.js';

const MAX_INPUTS = 5;
const MAX_FIELD_LENGTH = 127;
const INPUT_SELECTOR = "input[type='text']";

const state = {
	inputs: [''],
	responseSegments: [[]],
	errorMessage: null,
	isFetching: false,
	isReading: false
};

const elements = {};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
	elements.form = document.getElementById('ukesmail-form');
	elements.inputList = document.getElementById('input-list');
	elements.addRow = document.getElementById('add-row');
	elements.addButton = elements.addRow.querySelector('button');
	elements.resultBox = document.getElementById('result-box');
	elements.errorBox = document.getElementById('error-box');
	elements.errorCode = elements.errorBox.querySelector('code');
	elements.loadingOverlay = document.getElementById('loading-overlay');
	elements.resetButton = document.querySelector('button.reset');
	elements.submitButton = document.getElementById('button-submit');
	elements.commitContainer = document.getElementById('commit-container');
	elements.commitSha = document.getElementById('commit-sha');

	elements.form.addEventListener('submit', handleSubmit);
	elements.addButton.addEventListener('click', handleAddField);
	elements.resetButton.addEventListener('click', handleReset);

	renderApp(0);
	renderCommitSha();
	checkApiHealth();
}

function hasValue(values) {
	return values.some((value) => value.length !== 0);
}

function hasEmptyValue(values) {
	return values.some((value) => value.length === 0);
}

function canAdd() {
	return state.inputs.length < MAX_INPUTS && !hasEmptyValue(state.inputs);
}

function canSubmit() {
	return !state.isFetching && hasValue(state.inputs);
}

function getTextInputs() {
	return Array.from(elements.inputList.querySelectorAll(INPUT_SELECTOR));
}

function compactInputs(inputs) {
	return inputs.filter((value) => value.length !== 0);
}

function renderApp(focusIndex = null) {
	renderInputs(focusIndex);
	renderResults();
	updateFeedback();
}

function renderInputs(focusIndex = null) {
	const fragment = document.createDocumentFragment();

	state.inputs.forEach((value, index) => {
		fragment.append(createInputRow(value, index));
	});

	elements.inputList.replaceChildren(fragment);
	updateControls();

	if (Number.isInteger(focusIndex)) {
		requestAnimationFrame(() => {
			getTextInputs()[focusIndex]?.focus();
		});
	}
}

function createInputRow(value, index) {
	const row = document.createElement('div');
	row.className = 'input-row';

	const fieldset = document.createElement('fieldset');
	fieldset.disabled = state.isFetching;

	const removeButton = document.createElement('button');
	removeButton.type = 'button';
	removeButton.title = 'Tøm felt';
	removeButton.className = 'remove symbol nudge-left';
	removeButton.disabled = state.isFetching || state.inputs.length <= 1;
	removeButton.append(createScreenReaderText('Tøm felt'));
	removeButton.addEventListener('click', () => handleRemoveField(index));

	const input = document.createElement('input');
	input.type = 'text';
	input.maxLength = MAX_FIELD_LENGTH;
	input.name = `text-${index}`;
	input.ariaLabel = `Sak ${index + 1}`;
	input.disabled = state.isFetching;
	input.value = value;
	input.addEventListener('input', () => {
		state.inputs[index] = input.value;
		updateControls();
	});
	input.addEventListener('keydown', (event) => handleKeyDown(event, index));

	fieldset.append(removeButton, input);
	row.append(fieldset);

	return row;
}

function createScreenReaderText(text) {
	const span = document.createElement('span');
	span.className = 'sr-only';
	span.textContent = text;
	return span;
}

function renderResults() {
	const fragment = document.createDocumentFragment();

	state.responseSegments.forEach((paragraph) => {
		const p = document.createElement('p');

		paragraph.forEach((segment) => {
			const span = document.createElement('span');
			span.textContent = segment;
			p.append(span);
		});

		fragment.append(p);
	});

	elements.resultBox.replaceChildren(fragment);
}

function renderError() {
	elements.errorCode.textContent = state.errorMessage ?? '';
	elements.errorBox.hidden = state.errorMessage == null;
}

function renderCommitSha() {
	const commitSha = import.meta.env.VITE_COMMIT_SHA;
	if (commitSha === undefined) {
		return;
	}

	elements.commitSha.textContent = commitSha;
	elements.commitContainer.hidden = false;
}

function updateControls() {
	elements.addRow.hidden = state.inputs.length >= MAX_INPUTS;
	elements.addButton.disabled = !canAdd() || state.isFetching;
	elements.submitButton.disabled = !canSubmit();
	elements.resetButton.disabled = state.isFetching;
}

function updateFeedback() {
	elements.loadingOverlay.hidden = !(state.isFetching && !state.isReading);
	renderError();
	updateControls();
}

function syncInputsFromDom() {
	state.inputs = getTextInputs().map((input) => input.value);
}

function handleKeyDown(event, index) {
	const input = event.currentTarget;

	if (event.key === 'Enter') {
		event.preventDefault();
		state.inputs[index] = input.value;

		if (state.inputs.length >= MAX_INPUTS || state.inputs[index].length === 0) {
			elements.submitButton.focus();
			return;
		}

		handleAddField();
	} else if (event.key === 'Backspace' && input.value.length === 0) {
		event.preventDefault();
		handleRemoveField(index);
	}
}

function handleAddField() {
	if (!canAdd() || state.isFetching) {
		return;
	}

	state.inputs = compactInputs(state.inputs);
	state.inputs.push('');
	renderInputs(state.inputs.length - 1);
}

function handleRemoveField(index) {
	if (state.inputs.length <= 1 || state.isFetching) {
		return;
	}

	const nextInputs = compactInputs(state.inputs.filter((_, inputIndex) => inputIndex !== index));
	state.inputs = nextInputs.length > 0 ? nextInputs : [''];
	renderInputs(Math.max(0, Math.min(index, state.inputs.length - 1)));
}

function handleReset() {
	state.inputs = [''];
	state.responseSegments = [];
	state.errorMessage = null;
	state.isFetching = false;
	state.isReading = false;

	renderApp(0);
}

async function handleSubmit(event) {
	event.preventDefault();
	syncInputsFromDom();

	if (!canSubmit()) {
		return;
	}

	state.isFetching = true;
	state.isReading = false;
	state.responseSegments = [];
	state.errorMessage = null;

	renderInputs();
	renderResults();
	updateFeedback();

	try {
		await callChunked({ entries: state.inputs.filter((value) => value.length > 0) }, (segment) => {
			state.responseSegments = appendSegment(state.responseSegments, segment);
			renderResults();
			updateFeedback();
		});
	} catch (error) {
		state.errorMessage = error?.stack || error?.message || String(error);
		renderError();
	} finally {
		state.isFetching = false;
		state.isReading = false;
		renderInputs();
		updateFeedback();
	}
}

function appendSegment(segments, value) {
	state.isReading = true;

	const chunks = value.split('\n\n');

	if (segments.length === 0 || segments[segments.length - 1].length === 0) {
		return chunks.map((chunk) => [chunk]);
	}

	const nextSegments = segments.map((paragraph) => [...paragraph]);
	nextSegments[nextSegments.length - 1].push(chunks[0]);

	if (chunks.length > 1) {
		nextSegments.push(...chunks.slice(1).map((chunk) => [chunk]));
	}

	return nextSegments;
}

function checkApiHealth() {
	callHealthCheck()
		.then((response) => {
			if (response.status !== 200) {
				console.error('API responded with non-success.', response);
			}
		})
		.catch(() => {
			console.error('An error occurred while checking API liveness.');
		});
}
