import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runWithDependencies } from '../src/main.ts'

describe('index', () => {
  it('runs action with provided dependencies', async (t) => {
    const coreApi = {
      getInput: t.mock.fn(() => ''),
      info: t.mock.fn(() => undefined),
      warning: t.mock.fn(() => undefined),
      error: t.mock.fn(() => undefined),
      setFailed: t.mock.fn(() => undefined)
    }
    const githubApi = {
      context: { repo: { owner: 'some-owner', repo: 'some-repo' } },
      getOctokit: t.mock.fn(() => ({
        rest: {
          activity: { listRepoEvents: async () => ({ data: [] }) },
          pulls: {
            get: async () => ({ data: null }),
            requestReviewers: async () => ({})
          },
          repos: { listCollaborators: async () => ({ data: [] }) }
        }
      }))
    }

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.setFailed.mock.callCount(), 1)
  })
})
