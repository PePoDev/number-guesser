import { describe, expect, it } from 'vitest'
import { messages } from './messages'

function shape(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(shape)
	}
	if (typeof value === 'function') {
		return `function/${value.length}`
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, shape(entry)]),
		)
	}
	return typeof value
}

function leaves(value: unknown, path = ''): Array<[string, string]> {
	if (typeof value === 'function') {
		const render = value as (...args: number[]) => unknown
		return [[path, JSON.stringify(render(1, 2, 3, 4))]]
	}
	if (typeof value === 'string') {
		return [[path, value]]
	}
	if (value && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, entry]) =>
			leaves(entry, `${path}.${key}`),
		)
	}
	return []
}

describe('messages', () => {
	it('gives Thai the same entries as English', () => {
		expect(shape(messages.th)).toEqual(shape(messages.en))
	})

	it('translates every Thai entry instead of copying English', () => {
		const thai = new Map(leaves(messages.th))
		// The Guessle name, its wordmark, and its share heading read the same in every language.
		const names = ['.header.title', '.header.titleSignature', '.daily.heading', '.daily.shareTitle']
		const untranslated = leaves(messages.en)
			.filter(([path, english]) => thai.get(path) === english && !names.includes(path))
			.map(([path]) => path)

		expect(untranslated).toEqual([])
	})

	it('pluralizes English counts and keeps Thai counts invariant', () => {
		expect(messages.en.single.wonWith(1)).toBe('You won with 1 attempt!')
		expect(messages.en.single.wonWith(3)).toBe('You won with 3 attempts!')
		expect(messages.th.single.wonWith(1)).toBe('ชนะด้วยการทาย 1 ครั้ง!')
	})

	it('describes guess problems in both languages', () => {
		expect(messages.en.validation.range(3)).toBe(
			'Please enter a number between 000 and 999.',
		)
		expect(messages.th.validation.length(4)).toBe(
			'กรุณากรอกตัวเลขให้ครบ 4 หลัก',
		)
	})
})
