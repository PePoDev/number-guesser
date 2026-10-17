import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	SOUND_STORAGE_KEY,
	celebrate,
	launchConfetti,
	playWinSound,
	readSoundSetting,
	storeSoundSetting,
} from './celebrate'

function fakeContext() {
	return {
		globalAlpha: 1,
		fillStyle: '',
		scale: vi.fn(),
		clearRect: vi.fn(),
		save: vi.fn(),
		translate: vi.fn(),
		rotate: vi.fn(),
		fillRect: vi.fn(),
		restore: vi.fn(),
	}
}

function drawOn(context: ReturnType<typeof fakeContext> | null) {
	return vi
		.spyOn(HTMLCanvasElement.prototype, 'getContext')
		.mockImplementation(() => context as unknown as CanvasRenderingContext2D | null)
}

function reduceMotion(reduce: boolean) {
	const matchMedia = vi.fn((query: string) => ({
		matches: reduce && query === '(prefers-reduced-motion: reduce)',
	}))
	vi.stubGlobal('matchMedia', matchMedia)
	return matchMedia
}

const confetti = () => document.querySelector('canvas.confetti')

class FakeAudioContext {
	static instances: FakeAudioContext[] = []
	currentTime = 10
	destination = {}
	oscillators: Array<{
		type: string
		frequency: { value: number }
		start: ReturnType<typeof vi.fn>
		stop: ReturnType<typeof vi.fn>
		onended: (() => void) | null
	}> = []
	close = vi.fn(async () => undefined)

	constructor() {
		FakeAudioContext.instances.push(this)
	}

	createOscillator() {
		const oscillator = {
			type: '',
			frequency: { value: 0 },
			start: vi.fn(),
			stop: vi.fn(),
			onended: null,
			connect: (node: unknown) => node,
		}
		this.oscillators.push(oscillator)
		return oscillator
	}

	createGain() {
		return {
			gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
			connect: (node: unknown) => node,
		}
	}
}

beforeEach(() => {
	localStorage.clear()
	FakeAudioContext.instances = []
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	localStorage.clear()
	document.querySelectorAll('canvas').forEach((canvas) => canvas.remove())
})

describe('sound setting', () => {
	it('keeps sound on until the player turns it off', () => {
		expect(SOUND_STORAGE_KEY).toBe('number-guessing-sound')
		expect(readSoundSetting()).toBe(true)

		localStorage.setItem('number-guessing-sound', 'off')
		expect(readSoundSetting()).toBe(false)

		localStorage.setItem('number-guessing-sound', 'on')
		expect(readSoundSetting()).toBe(true)
	})

	it('saves the choice as on or off', () => {
		storeSoundSetting(false)
		expect(localStorage.getItem('number-guessing-sound')).toBe('off')
		expect(readSoundSetting()).toBe(false)

		storeSoundSetting(true)
		expect(localStorage.getItem('number-guessing-sound')).toBe('on')
		expect(readSoundSetting()).toBe(true)
	})

	it('keeps sound on and stays quiet when storage is unavailable', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked')
		})

		expect(() => storeSoundSetting(false)).not.toThrow()
		expect(readSoundSetting()).toBe(true)
	})
})

describe('launchConfetti', () => {
	it('draws a hidden canvas over the page and removes it after about two seconds', () => {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })
		reduceMotion(false)
		const context = fakeContext()
		drawOn(context)

		launchConfetti()

		const canvas = confetti()
		expect(canvas).toBeInTheDocument()
		expect(canvas?.parentElement).toBe(document.body)
		expect(canvas).toHaveAttribute('aria-hidden', 'true')

		vi.advanceTimersByTime(1000)
		expect(context.fillRect).toHaveBeenCalled()
		expect(confetti()).toBeInTheDocument()

		vi.advanceTimersByTime(1500)
		expect(confetti()).not.toBeInTheDocument()
	})

	it('keeps the canvas window-sized on high-density screens', () => {
		reduceMotion(false)
		const context = fakeContext()
		drawOn(context)
		vi.stubGlobal('devicePixelRatio', 2)

		launchConfetti()

		const canvas = confetti() as HTMLCanvasElement
		expect(canvas.width).toBe(window.innerWidth * 2)
		expect(canvas.style.width).toBe(`${window.innerWidth}px`)
		expect(canvas.style.height).toBe(`${window.innerHeight}px`)
		expect(context.scale).toHaveBeenCalledWith(2, 2)
		canvas.remove()
	})

	it('skips the confetti when the system asks for reduced motion', () => {
		reduceMotion(true)
		const getContext = drawOn(fakeContext())

		launchConfetti()

		expect(confetti()).not.toBeInTheDocument()
		expect(getContext).not.toHaveBeenCalled()
	})

	it('skips the confetti when the canvas cannot draw', () => {
		reduceMotion(false)
		drawOn(null)

		launchConfetti()

		expect(document.querySelector('canvas')).not.toBeInTheDocument()
	})
})

describe('playWinSound', () => {
	it('plays four rising notes, one after another, then closes the audio', () => {
		vi.stubGlobal('AudioContext', FakeAudioContext)

		playWinSound()

		expect(FakeAudioContext.instances).toHaveLength(1)
		const [audio] = FakeAudioContext.instances
		const notes = audio.oscillators
		expect(notes).toHaveLength(4)
		const frequencies = notes.map((note) => note.frequency.value)
		const starts = notes.map((note) => note.start.mock.calls[0][0] as number)
		expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b))
		expect(new Set(frequencies).size).toBe(4)
		expect(starts[0]).toBeGreaterThanOrEqual(audio.currentTime)
		expect(starts).toEqual([...starts].sort((a, b) => a - b))
		expect(new Set(starts).size).toBe(4)
		notes.forEach((note, index) => {
			expect(note.stop.mock.calls[0][0]).toBeGreaterThan(starts[index])
		})

		expect(audio.close).not.toHaveBeenCalled()
		notes[3].onended?.()
		expect(audio.close).toHaveBeenCalledOnce()
	})

	it('does nothing without Web Audio', () => {
		vi.stubGlobal('AudioContext', undefined)
		vi.stubGlobal('webkitAudioContext', undefined)

		expect(() => playWinSound()).not.toThrow()
	})

	it('falls back to the prefixed Web Audio constructor', () => {
		vi.stubGlobal('AudioContext', undefined)
		vi.stubGlobal('webkitAudioContext', FakeAudioContext)

		playWinSound()

		expect(FakeAudioContext.instances).toHaveLength(1)
		expect(FakeAudioContext.instances[0].oscillators).toHaveLength(4)
	})
})

describe('celebrate', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })
		reduceMotion(false)
		drawOn(fakeContext())
		vi.stubGlobal('AudioContext', FakeAudioContext)
	})

	it('throws confetti and plays the chime', () => {
		celebrate(true)

		expect(confetti()).toBeInTheDocument()
		expect(FakeAudioContext.instances).toHaveLength(1)
	})

	it('throws confetti without a sound when sound effects are off', () => {
		celebrate(false)

		expect(confetti()).toBeInTheDocument()
		expect(FakeAudioContext.instances).toHaveLength(0)
	})
})
