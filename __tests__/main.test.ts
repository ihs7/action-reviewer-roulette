import * as core from '@actions/core'
import * as github from '@actions/github'
import * as main from '../src/main'

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let getOctokitMock: jest.SpiedFunction<typeof github.getOctokit>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    getOctokitMock = jest.spyOn(github, 'getOctokit').mockImplementation()
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'some-owner',
        repo: 'some-repo'
      }
    })
  })

  it('sets the time output', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'number-of-reviewers':
          return '5'
        case 'pull-request-number':
          return '123'
        case 'token':
          return 'some-token'
        case 'dry-run':
          return 'false'
        default:
          return ''
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOctokitMock.mockImplementation((): any => {
      return {
        rest: {
          activity: {
            listRepoEvents: jest.fn().mockResolvedValue({ data: [] })
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
  })
})
