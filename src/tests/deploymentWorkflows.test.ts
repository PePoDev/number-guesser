import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const firebaseConfigNames = [
	'PUBLIC_FIREBASE_API_KEY',
	'PUBLIC_FIREBASE_AUTH_DOMAIN',
	'PUBLIC_FIREBASE_PROJECT_ID',
	'PUBLIC_FIREBASE_STORAGE_BUCKET',
	'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
	'PUBLIC_FIREBASE_APP_ID',
]

function readWorkflow(name: string): string {
	return readFileSync(
		resolve(process.cwd(), '.github', 'workflows', name),
		'utf8',
	)
}

describe('deployment workflows', () => {
	it('builds the Pages client from validated Firebase secrets', () => {
		const workflow = readWorkflow('deploy.yml')

		for (const name of firebaseConfigNames) {
			expect(workflow).toContain(`${name}: \${{ secrets.${name} }}`)
		}
		expect(workflow).toContain('if [ -z "${!name}" ]')
		expect(workflow).not.toContain('vars.PUBLIC_FIREBASE_')
	})

	it('runs Firebase deployment with Java 21 and the secret project ID', () => {
		const workflow = readWorkflow('deploy-firebase.yml')

		expect(workflow).toContain('uses: actions/setup-java@v4')
		expect(workflow).toMatch(/java-version:\s*["']?21/)
		expect(workflow).toContain(
			'--project "${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}"',
		)
		expect(workflow).not.toContain('vars.PUBLIC_FIREBASE_PROJECT_ID')
	})
})
