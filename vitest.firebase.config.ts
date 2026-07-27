import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		fileParallelism: false,
		include: ['src/lib/firebase/firestore.rules.test.ts'],
	},
})
