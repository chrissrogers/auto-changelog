import Octokit from '@octokit/rest'
import semver from 'semver'
import { niceDate } from './utils'

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/
const NUMERIC_PATTERN = /^\d+(\.\d+)?$/

export async function parseReleases (commits, remote, latestVersion, options) {
  let release = newRelease(latestVersion)
  const releases = []
  const sortCommits = commitSorter(options)
  const filterByGithubLabel = options.mergeGithubLabel && /github/.test(remote.hostname)
  let githubIssues = []

  if (filterByGithubLabel) {
    const [ owner, repo ] = remote.repo.split('/')
    const octokit = new Octokit({ auth: process.env.AUTO_CHANGELOG_GITHUB_TOKEN })
    const options = octokit.issues.listForRepo.endpoint.merge({ owner, repo, state: 'all' })
    githubIssues = await octokit.paginate(options)
  }

  for (let commit of commits) {
    if (commit.tag) {
      if (release.tag || options.unreleased) {
        releases.push({
          ...release,
          href: getCompareLink(
            `${options.tagPrefix}${commit.tag}`,
            release.tag ? `${options.tagPrefix}${release.tag}` : 'HEAD',
            remote
          ),
          commits: sliceCommits(release.commits.sort(sortCommits), options, release),
          major: !options.tagPattern && commit.tag && release.tag && semver.diff(commit.tag, release.tag) === 'major'
        })
      }
      const summary = getSummary(commit.message, options.releaseSummary)
      release = newRelease(commit.tag, commit.date, summary)
    }

    if (commit.merge) {
      if (filterByGithubLabel) {
        const issue = githubIssues.find(issue => issue.number == commit.merge.id)
        if (!issue) continue
        if (!issue.labels.map(label => label.name).includes(options.mergeGithubLabel)) continue
      }

      release.merges.push(commit.merge)
    } else if (commit.fixes) {
      release.fixes.push({
        fixes: commit.fixes,
        commit
      })
    } else if (filterCommit(commit, options, release)) {
      release.commits.push(commit)
    }
  }
  releases.push({
    ...release,
    commits: sliceCommits(release.commits.sort(sortCommits), options, release)
  })
  return releases
}

export function sortReleases (a, b) {
  const tags = {
    a: inferSemver(a.tag),
    b: inferSemver(b.tag)
  }
  if (tags.a && tags.b) {
    if (semver.valid(tags.a) && semver.valid(tags.b)) {
      return semver.rcompare(tags.a, tags.b)
    }
    if (NUMERIC_PATTERN.test(tags.a) && NUMERIC_PATTERN.test(tags.b)) {
      return parseFloat(tags.a) < parseFloat(tags.b) ? 1 : -1
    }
    if (tags.a === tags.b) {
      return 0
    }
    return tags.a < tags.b ? 1 : -1
  }
  if (tags.a) return 1
  if (tags.b) return -1
  return 0
}

function inferSemver (tag) {
  if (/^v\d+$/.test(tag)) {
    // v1 becomes v1.0.0
    return `${tag}.0.0`
  }
  if (/^v\d+\.\d+$/.test(tag)) {
    // v1.0 becomes v1.0.0
    return `${tag}.0`
  }
  return tag
}

function newRelease (tag = null, date = new Date().toISOString(), summary = null) {
  return {
    commits: [],
    fixes: [],
    merges: [],
    tag,
    date,
    summary,
    title: tag || 'Unreleased',
    niceDate: niceDate(date),
    isoDate: date.slice(0, 10)
  }
}

function sliceCommits (commits, { commitLimit, backfillLimit }, release) {
  if (commitLimit === false) {
    return commits
  }
  const emptyRelease = release.fixes.length === 0 && release.merges.length === 0
  const limit = emptyRelease ? backfillLimit : commitLimit
  const minLimit = commits.filter(c => c.breaking).length
  return commits.slice(0, Math.max(minLimit, limit))
}

function filterCommit (commit, { ignoreCommitPattern }, release) {
  if (commit.breaking) {
    return true
  }
  if (ignoreCommitPattern) {
    // Filter out commits that match ignoreCommitPattern
    return new RegExp(ignoreCommitPattern).test(commit.subject) === false
  }
  if (semver.valid(commit.subject)) {
    // Filter out version commits
    return false
  }
  if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
    // Filter out merge commits
    return false
  }
  if (release.merges.findIndex(m => m.message === commit.subject) !== -1) {
    // Filter out commits with the same message as an existing merge
    return false
  }
  return true
}

function getCompareLink (from, to, remote) {
  if (!remote) {
    return null
  }
  if (/bitbucket/.test(remote.hostname)) {
    return `${remote.url}/compare/${to}..${from}`
  }
  if (/dev\.azure/.test(remote.hostname) || /visualstudio/.test(remote.hostname)) {
    return `${remote.url}/branches?baseVersion=GT${to}&targetVersion=GT${from}&_a=commits`
  }
  return `${remote.url}/compare/${from}...${to}`
}

function getSummary (message, releaseSummary) {
  if (!message || !releaseSummary) {
    return null
  }
  if (COMMIT_MESSAGE_PATTERN.test(message)) {
    return message.match(COMMIT_MESSAGE_PATTERN)[1]
  }
  return null
}

function commitSorter ({ sortCommits }) {
  return (a, b) => {
    if (!a.breaking && b.breaking) return 1
    if (a.breaking && !b.breaking) return -1
    if (sortCommits === 'date') return new Date(a.date) - new Date(b.date)
    return (b.insertions + b.deletions) - (a.insertions + a.deletions)
  }
}
