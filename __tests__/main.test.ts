import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runWithDependencies } from '../src/main.ts'

const createTestOctokit = (overrides = {}) => {
  return {
    rest: {
      activity: { listRepoEvents: async () => ({ data: [] }) },
      pulls: {
        get: async () => ({
          data: { user: { login: 'any' }, requested_reviewers: [] }
        }),
        requestReviewers: async () => ({})
      },
      repos: { listCollaborators: async () => ({ data: [] }) }
    },
    ...overrides
  }
}

const createCoreApi = (t, inputs) => {
  return {
    getInput: t.mock.fn((name) => inputs[name] ?? ''),
    info: t.mock.fn(() => undefined),
    warning: t.mock.fn(() => undefined),
    error: t.mock.fn(() => undefined),
    setFailed: t.mock.fn(() => undefined)
  }
}

const createGithubApi = (t, repo, octokit) => {
  return {
    context: { repo },
    getOctokit: t.mock.fn(() => octokit)
  }
}

describe('action', () => {
  it('sets failed when pull-request-number not supplied', async (t) => {
    const inputs = {
      'number-of-reviewers': '5',
      'pull-request-number': '',
      token: 'some-token'
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      "Input 'pull-request-number' not supplied. Unable to continue."
    ])
  })

  it('sets failed when number-of-reviewers not supplied', async (t) => {
    const inputs = {
      'number-of-reviewers': '',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      "Input 'number-of-reviewers' not supplied. Unable to continue."
    ])
  })

  it('sets failed when pull-request-number is invalid', async (t) => {
    const invalidPrNumber = 'foo'
    const inputs = {
      'number-of-reviewers': '5',
      'pull-request-number': invalidPrNumber,
      token: 'some-token'
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      `Invalid value for 'pull-request-number': ${invalidPrNumber}`
    ])
  })

  it('sets failed when max-number-of-reviewers is invalid', async (t) => {
    const invalidMaxNumberOfReviewers = 'foo'
    const inputs = {
      'number-of-reviewers': '5',
      'pull-request-number': '123',
      token: 'some-token',
      'max-number-of-reviewers': invalidMaxNumberOfReviewers
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      `Invalid value for 'max-number-of-reviewers': ${invalidMaxNumberOfReviewers}`
    ])
  })

  it('sets failed when number-of-reviewers is invalid', async (t) => {
    const invalidNumberOfReviewers = 'foo'
    const inputs = {
      'number-of-reviewers': invalidNumberOfReviewers,
      'pull-request-number': '123',
      token: 'some-token'
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      `Invalid value for 'number-of-reviewers': ${invalidNumberOfReviewers}`
    ])
  })

  it('sets failed when token not supplied', async (t) => {
    const inputs = {
      'number-of-reviewers': '5',
      'pull-request-number': '123',
      token: ''
    }
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      createTestOctokit()
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      "Input 'token' not supplied. Unable to continue."
    ])
  })

  it('sets failed when PR not found', async (t) => {
    const prNumber = '123'
    const inputs = {
      'number-of-reviewers': '5',
      'pull-request-number': prNumber,
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        pulls: {
          get: async () => ({ data: null }),
          requestReviewers: async () => ({})
        },
        activity: { listRepoEvents: async () => ({ data: [] }) },
        repos: { listCollaborators: async () => ({ data: [] }) }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.setFailed.mock.calls[0].arguments, [
      `PR #${prNumber} not found.`
    ])
  })

  it('should find no eligible reviewers', async (t) => {
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({ data: [{ actor: { login: 'any' } }] })
        },
        pulls: {
          get: async () => ({
            data: { user: { login: 'any' }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        },
        repos: { listCollaborators: async () => ({ data: [{ login: 'any' }] }) }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.warning.mock.calls[0].arguments, [
      'Found no eligible reviewers to add.'
    ])
  })

  it('should add info when dry-run', async (t) => {
    const reviewerLoginToAdd = 'other'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token',
      'dry-run': 'true'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [{ actor: { login: reviewerLoginToAdd } }]
          })
        },
        pulls: {
          get: async () => ({
            data: { user: { login: 'any' }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Dry run enabled. Skipping adding reviewers. Would've added following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should add reviewers', async (t) => {
    const reviewerLoginToAdd = 'other'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [{ actor: { login: reviewerLoginToAdd } }]
          })
        },
        pulls: {
          get: async () => ({
            data: { user: { login: 'any' }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'Found 1 users from recent activity who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should not pick excluded reviewers', async (t) => {
    const reviewerLoginToAdd = 'other'
    const excludedReviewer = 'excluded'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token',
      'excluded-reviewers': excludedReviewer
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [
              { actor: { login: reviewerLoginToAdd } },
              { actor: { login: excludedReviewer } }
            ]
          })
        },
        pulls: {
          get: async () => ({
            data: { user: { login: 'any' }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'Found 1 users from recent activity who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should pick random reviewers', async (t) => {
    const reviewerLoginToAdd = 'guaranteed-random'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [
              { actor: { login: '1' } },
              { actor: { login: '2' } },
              { actor: { login: reviewerLoginToAdd } }
            ]
          })
        },
        pulls: {
          get: async () => ({
            data: { user: { login: 'any' }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    t.mock.method(global.Math, 'random', () => 1)
    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'Found 3 users from recent activity who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should not add existing reviewer', async (t) => {
    const reviewerLoginToAdd = 'other'
    const existingReviewer = 'existing'
    const prRaiser = 'any'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [
              { actor: { login: reviewerLoginToAdd } },
              { actor: { login: existingReviewer } },
              { actor: { login: prRaiser } }
            ]
          })
        },
        pulls: {
          get: async () => ({
            data: {
              user: { login: prRaiser },
              requested_reviewers: [{ login: existingReviewer }]
            }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'Found 1 users from recent activity who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should not add more reviewers if max-number-of-reviewers is reached', async (t) => {
    const prNumber = '123'
    const maxNumberOfReviewers = 1
    const reviewerLoginToAdd = 'other'
    const existingReviewer = 'existing'
    const prRaiser = 'any'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': prNumber,
      token: 'some-token',
      'max-number-of-reviewers': maxNumberOfReviewers.toString()
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [
              { actor: { login: reviewerLoginToAdd } },
              { actor: { login: existingReviewer } },
              { actor: { login: prRaiser } }
            ]
          })
        },
        pulls: {
          get: async () => ({
            data: {
              user: { login: prRaiser },
              requested_reviewers: [{ login: existingReviewer }]
            }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[0].arguments, [
      `PR #${prNumber} already has 1 reviewers. ${maxNumberOfReviewers} reviewer(s) is the maximum. Not adding more reviewers.`
    ])
  })

  it('should add reviewers until max-number-of-reviewers is reached', async (t) => {
    const prNumber = '123'
    const maxNumberOfReviewers = 2
    const reviewerLoginToAdd = 'other'
    const existingReviewer = 'existing'
    const prRaiser = 'any'
    const inputs = {
      'number-of-reviewers': '2',
      'pull-request-number': prNumber,
      token: 'some-token',
      'max-number-of-reviewers': maxNumberOfReviewers.toString()
    }
    const octokit = createTestOctokit({
      rest: {
        activity: {
          listRepoEvents: async () => ({
            data: [
              { actor: { login: reviewerLoginToAdd } },
              { actor: { login: existingReviewer } },
              { actor: { login: prRaiser } }
            ]
          })
        },
        pulls: {
          get: async () => ({
            data: {
              user: { login: prRaiser },
              requested_reviewers: [{ login: existingReviewer }]
            }
          }),
          requestReviewers: async () => ({})
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[0].arguments, [
      `Will add 1 reviewers to PR: #${prNumber}`
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'Found 1 users from recent activity who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    ])
  })

  it('should fall back to collaborators when no recent activity', async (t) => {
    const collaboratorToAdd = 'collaborator-user'
    const prRaiser = 'pr-author'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: { listRepoEvents: async () => ({ data: [] }) },
        pulls: {
          get: async () => ({
            data: { user: { login: prRaiser }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        },
        repos: {
          listCollaborators: async () => ({
            data: [{ login: collaboratorToAdd }, { login: prRaiser }]
          })
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[1].arguments, [
      'No recent activity found, falling back to repository collaborators.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      'Found 1 collaborators who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[3].arguments, [
      `Adding following users as reviewers: ${collaboratorToAdd}`
    ])
  })

  it('should exclude bots from collaborators fallback', async (t) => {
    const collaboratorToAdd = 'human-collaborator'
    const prRaiser = 'pr-author'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: { listRepoEvents: async () => ({ data: [] }) },
        pulls: {
          get: async () => ({
            data: { user: { login: prRaiser }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        },
        repos: {
          listCollaborators: async () => ({
            data: [
              { login: collaboratorToAdd },
              { login: 'dependabot[bot]' },
              { login: 'github-actions[bot]' }
            ]
          })
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    assert.deepStrictEqual(coreApi.info.mock.calls[2].arguments, [
      'Found 1 collaborators who are eligible to be reviewers.'
    ])
    assert.deepStrictEqual(coreApi.info.mock.calls[3].arguments, [
      `Adding following users as reviewers: ${collaboratorToAdd}`
    ])
  })

  it('should warn when collaborators API fails', async (t) => {
    const prRaiser = 'pr-author'
    const inputs = {
      'number-of-reviewers': '1',
      'pull-request-number': '123',
      token: 'some-token'
    }
    const octokit = createTestOctokit({
      rest: {
        activity: { listRepoEvents: async () => ({ data: [] }) },
        pulls: {
          get: async () => ({
            data: { user: { login: prRaiser }, requested_reviewers: [] }
          }),
          requestReviewers: async () => ({})
        },
        repos: {
          listCollaborators: async () => {
            throw new Error('Insufficient permissions')
          }
        }
      }
    })
    const coreApi = createCoreApi(t, inputs)
    const githubApi = createGithubApi(
      t,
      { owner: 'some-owner', repo: 'some-repo' },
      octokit
    )

    await runWithDependencies(coreApi, githubApi)

    assert.strictEqual(coreApi.error.mock.callCount(), 0)
    const warningMessages = coreApi.warning.mock.calls.map(
      (call) => call.arguments[0]
    )
    assert.deepStrictEqual(warningMessages, [
      'Failed to fetch collaborators: Insufficient permissions',
      'Found no eligible reviewers to add.'
    ])
  })
})
