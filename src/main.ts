import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const { owner, repo } = github.context.repo
    const octokit = github.getOctokit(token)
    const numberOfReviewers = core.getInput('number-of-reviewers')
    const prNumber = core.getInput('pull-request-number')
    const dryRun = core.getInput('dry-run')

    if (!prNumber) {
      throw new Error(
        `Input 'pull-request-number' not supplied. Unable to continue.`
      )
    }
    let pull_number: number
    try {
      pull_number = parseInt(prNumber)
    } catch (error) {
      throw new Error(`Invalid value for 'pull-request-number': ${prNumber}`)
    }
    if (!token) {
      throw new Error(`Input 'token' not supplied. Unable to continue.`)
    }
    if (!numberOfReviewers) {
      throw new Error(
        `Input 'numberOfReviewers' not supplied. Unable to continue.`
      )
    }
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number
    })
    if (pr == null) {
      throw new Error(`PR #${pull_number} not found.`)
    }

    core.info(`Will add ${numberOfReviewers} reviewers to PR: #${pull_number}`)

    const { data: activities } = await octokit.rest.activity.listRepoEvents({
      owner,
      repo,
      per_page: 100
    })

    const activeUsers = new Set<string>()
    for (const activity of activities) {
      if (activeUsers.size >= 50) break
      if (activity.actor == null) continue
      if (activity.actor.login == null) continue
      if (activity.actor.login === pr.user.login) continue
      if (activity.actor.login.includes('[bot]')) continue
      activeUsers.add(activity.actor.login)
    }

    const reviewers = Array.from(activeUsers)
      .sort(() => Math.random() - 0.5)
      .slice(0, parseInt(numberOfReviewers))

    if (reviewers.length === 0) {
      core.warning('Found no eligible reviewers to add.')
      return
    } else {
      core.info(
        `Found ${activeUsers.size} users who are eligible to be reviewers.`
      )
    }

    if (dryRun === 'true') {
      core.info(
        `Dry run enabled. Skipping adding reviewers. Would've added following users as reviewers: ${reviewers.join(', ')}`
      )
      return
    }
    core.info(`Adding following users as reviewers: ${reviewers.join(', ')}`)
    const parameters = {
      owner,
      repo,
      pull_number,
      reviewers
    }
    await octokit.rest.pulls.requestReviewers(parameters)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
