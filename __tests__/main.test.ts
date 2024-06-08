import * as core from '@actions/core'
import * as github from '@actions/github'
import * as main from '../src/main'

const runMock = jest.spyOn(main, 'run')

let infoMock: jest.SpiedFunction<typeof core.info>
let warningMock: jest.SpiedFunction<typeof core.warning>
let errorMock: jest.SpiedFunction<typeof core.error>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let getOctokitMock: jest.SpiedFunction<typeof github.getOctokit>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    infoMock = jest.spyOn(core, 'info').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    getOctokitMock = jest.spyOn(github, 'getOctokit').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'some-owner',
        repo: 'some-repo'
      }
    })
  })

  it('sets failed when pull-request-number not supplied', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '5'
        case 'pull-request-number':
          return ''
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "Input 'pull-request-number' not supplied. Unable to continue."
    )
  })

  it('sets failed when number-of-reviewers not supplied', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return ''
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "Input 'numberOfReviewers' not supplied. Unable to continue."
    )
  })

  it('sets failed when pull-request-number is invalid', async () => {
    const invalidPrNumber = 'foo'
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '5'
        case 'pull-request-number':
          return invalidPrNumber
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `Invalid value for 'pull-request-number': ${invalidPrNumber}`
    )
  })

  it('sets failed when token not supplied', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '5'
        case 'pull-request-number':
          return '123'
        case 'token':
          return ''
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "Input 'token' not supplied. Unable to continue."
    )
  })

  it('sets failed when PR not found', async () => {
    const prNumber = '123'
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '5'
        case 'pull-request-number':
          return prNumber
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          pulls: {
            get: jest.fn().mockResolvedValue({ data: null })
          }
        }
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `PR #${prNumber} not found.`
    )
  })

  it('should find no eligible reviewers', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '1'
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          activity: {
            listRepoEvents: jest
              .fn()
              .mockResolvedValue({ data: [{ actor: { login: 'any' } }] })
          },
          pulls: {
            get: jest
              .fn()
              .mockResolvedValue({ data: { user: { login: 'any' } } })
          }
        }
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(warningMock).toHaveBeenNthCalledWith(
      1,
      'Found no eligible reviewers to add.'
    )
  })

  it('should add info when dry-run', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '1'
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        case 'dry-run':
          return 'true'
        default:
          return ''
      }
    })
    const reviewerLoginToAdd = 'other'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          activity: {
            listRepoEvents: jest.fn().mockResolvedValue({
              data: [{ actor: { login: reviewerLoginToAdd } }]
            })
          },
          pulls: {
            get: jest
              .fn()
              .mockResolvedValue({ data: { user: { login: 'any' } } })
          }
        }
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenNthCalledWith(
      3,
      `Dry run enabled. Skipping adding reviewers. Would've added following users as reviewers: ${reviewerLoginToAdd}`
    )
  })

  it('should add reviewers', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '1'
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    const reviewerLoginToAdd = 'other'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          activity: {
            listRepoEvents: jest.fn().mockResolvedValue({
              data: [{ actor: { login: reviewerLoginToAdd } }]
            })
          },
          pulls: {
            get: jest
              .fn()
              .mockResolvedValue({ data: { user: { login: 'any' } } })
          }
        }
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenNthCalledWith(
      2,
      'Found 1 users who are eligible to be reviewers.'
    )
    expect(infoMock).toHaveBeenNthCalledWith(
      3,
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    )
  })

  it('should pick random reviewers', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '1'
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        default:
          return ''
      }
    })
    jest.spyOn(global.Math, 'random').mockReturnValue(1)
    const reviewerLoginToAdd = 'guaranteed-random'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          activity: {
            listRepoEvents: jest.fn().mockResolvedValue({
              data: [
                { actor: { login: '1' } },
                { actor: { login: '2' } },
                { actor: { login: reviewerLoginToAdd } }
              ]
            })
          },
          pulls: {
            get: jest
              .fn()
              .mockResolvedValue({ data: { user: { login: 'any' } } })
          }
        }
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenNthCalledWith(
      2,
      'Found 3 users who are eligible to be reviewers.'
    )
    expect(infoMock).toHaveBeenNthCalledWith(
      3,
      `Adding following users as reviewers: ${reviewerLoginToAdd}`
    )
  })
})
