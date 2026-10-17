export const SOUND_STORAGE_KEY = 'number-guessing-sound'

const CONFETTI_MS = 2200
const CONFETTI_PIECES = 140
const CONFETTI_COLORS = [
	'--accent-blue',
	'--accent-yellow',
	'--accent-orange',
	'--accent-green',
	'--accent-purple',
]
// C5, E5, G5, C6: a rising major arpeggio.
const CHIME_HZ = [523.25, 659.25, 783.99, 1046.5]
const NOTE_GAP_S = 0.11
const NOTE_LENGTH_S = 0.45

interface Piece {
	x: number
	y: number
	vx: number
	vy: number
	size: number
	angle: number
	spin: number
	color: string
}

// Storage can throw in private browsing or with blocked site data; sound then
// stays on for the visit.
export function readSoundSetting(): boolean {
	try {
		return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off'
	} catch {
		return true
	}
}

export function storeSoundSetting(on: boolean): void {
	try {
		localStorage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off')
	} catch {
		return
	}
}

export function launchConfetti(): void {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
		return
	}
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	if (!context) {
		return
	}
	const ratio = window.devicePixelRatio || 1
	const width = window.innerWidth
	const height = window.innerHeight
	canvas.width = width * ratio
	canvas.height = height * ratio
	// The bitmap is scaled for sharp pieces; the element itself stays window-sized.
	canvas.style.width = `${width}px`
	canvas.style.height = `${height}px`
	canvas.className = 'confetti'
	canvas.setAttribute('aria-hidden', 'true')
	context.scale(ratio, ratio)
	document.body.append(canvas)

	const root = getComputedStyle(document.documentElement)
	const colors = CONFETTI_COLORS.map((token) => root.getPropertyValue(token).trim())
	const pieces: Piece[] = Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
		x: width / 2 + (Math.random() - 0.5) * width * 0.3,
		y: height * 0.35,
		vx: (Math.random() - 0.5) * 14,
		vy: -6 - Math.random() * 12,
		size: 6 + Math.random() * 6,
		angle: Math.random() * Math.PI,
		spin: (Math.random() - 0.5) * 0.4,
		color: colors[index % colors.length],
	}))

	const start = performance.now()
	const frame = (now: number) => {
		const elapsed = now - start
		context.clearRect(0, 0, width, height)
		context.globalAlpha = Math.max(0, 1 - elapsed / CONFETTI_MS)
		for (const piece of pieces) {
			piece.vy += 0.35
			piece.vx *= 0.99
			piece.x += piece.vx
			piece.y += piece.vy
			piece.angle += piece.spin
			context.save()
			context.translate(piece.x, piece.y)
			context.rotate(piece.angle)
			context.fillStyle = piece.color
			context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2)
			context.restore()
		}
		if (elapsed < CONFETTI_MS) {
			requestAnimationFrame(frame)
		} else {
			canvas.remove()
		}
	}
	requestAnimationFrame(frame)
}

export function playWinSound(): void {
	const AudioContextClass =
		window.AudioContext ??
		(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
	if (!AudioContextClass) {
		return
	}
	const audio = new AudioContextClass()
	CHIME_HZ.forEach((frequency, index) => {
		const start = audio.currentTime + index * NOTE_GAP_S
		const oscillator = audio.createOscillator()
		const gain = audio.createGain()
		oscillator.type = 'triangle'
		oscillator.frequency.value = frequency
		gain.gain.setValueAtTime(0.0001, start)
		gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
		gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_LENGTH_S)
		oscillator.connect(gain).connect(audio.destination)
		oscillator.start(start)
		oscillator.stop(start + NOTE_LENGTH_S)
		if (index === CHIME_HZ.length - 1) {
			oscillator.onended = () => void audio.close()
		}
	})
}

export function celebrate(sound: boolean): void {
	launchConfetti()
	if (sound) {
		playWinSound()
	}
}
