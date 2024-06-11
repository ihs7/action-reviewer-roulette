# Reviewer Roulette (GitHub Action)

[![GitHub Super-Linter](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/check-dist.yml/badge.svg)](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ihs7/action-reviewer-roulette/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action automatically assigns a specified number of random reviewers
to a pull request. It fetches events for the repository to identify active users
and adds them as reviewers to the PR.

![Reviewers added](./img/add_reviewer_example.png)

## Usage

### Classic usage

```yml
on:
  pull_request_target:
    types: [opened, ready_for_review, reopened]

jobs:
  example_assign_reviews:
    runs-on: ubuntu-latest
    name: An example job to assign reviewers
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Assign random reviewers to PR
        uses: ihs7/action-reviewer-roulette@v1
        with:
          number-of-reviewers: 2
```

### Using with peter-evans/create-pull-request

If you are using
[peter-evans/create-pull-request](https://github.com/peter-evans/create-pull-request)
to create pull requests, you can use this action to subsequently adding random
reviewers to the pull request created.

```yml
- name: Create Pull Request
  id: cpr
  uses: peter-evans/create-pull-request@v6
- name: Assign random reviewers to PR
  uses: ihs7/action-reviewer-roulette@v1
  if: ${{ steps.cpr.outputs.pull-request-number }}
  with:
    number-of-reviewers: 2
    pull-request-number: ${{ steps.cpr.outputs.pull-request-number }}
```

## Action inputs

All inputs are **optional**. If not set, sensible defaults will be used.

<!-- prettier-ignore -->
| Name | Description | Default |
| --- | --- | --- |
| `token` | `GITHUB_TOKEN` (permissions `contents: write` and `pull-requests: write`) or a `repo` scoped [Personal Access Token (PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). | `GITHUB_TOKEN` |
| `pull-request-number` | The number of the pull request to assign reviewers. | `${{ github.event.pull_request.number }}` |
| `number-of-reviewers` | The number of reviewers add to the PR | `1` |
| `dry-run` | Useful when testing the action, does everything but add reviewers to PR | `false` |

## Workflow permissions

The default `GITHUB_TOKEN` should have permission needed to run this action.

If you are using granular permissions in your GitHub Actions workflow file and
seeing `Resource not accessible by integration` error, the action needs the
following permissions:

```yml
permissions:
  contents: read
  pull-requests: write
```

See
[jobs.<job_id>.permissions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idpermissions)
for more information.
