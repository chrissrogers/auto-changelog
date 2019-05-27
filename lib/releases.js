"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseReleases = parseReleases;
exports.sortReleases = sortReleases;

var _rest = _interopRequireDefault(require("@octokit/rest"));

var _semver = _interopRequireDefault(require("semver"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/;
var COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/;
var NUMERIC_PATTERN = /^\d+(\.\d+)?$/;

function parseReleases(_x, _x2, _x3, _x4) {
  return _parseReleases.apply(this, arguments);
}

function _parseReleases() {
  _parseReleases = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(commits, remote, latestVersion, options) {
    var release, releases, sortCommits, filterByGithubLabel, githubIssues, _remote$repo$split, _remote$repo$split2, owner, repo, octokit, _options, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step, _ret;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            release = newRelease(latestVersion);
            releases = [];
            sortCommits = commitSorter(options);
            filterByGithubLabel = options.mergeGithubLabel && /github/.test(remote.hostname);
            githubIssues = [];

            if (!filterByGithubLabel) {
              _context.next = 12;
              break;
            }

            _remote$repo$split = remote.repo.split('/'), _remote$repo$split2 = _slicedToArray(_remote$repo$split, 2), owner = _remote$repo$split2[0], repo = _remote$repo$split2[1];
            octokit = new _rest["default"]({
              auth: process.env.AUTO_CHANGELOG_GITHUB_TOKEN
            });
            _options = octokit.issues.listForRepo.endpoint.merge({
              owner: owner,
              repo: repo,
              state: 'all'
            });
            _context.next = 11;
            return octokit.paginate(_options);

          case 11:
            githubIssues = _context.sent;

          case 12:
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context.prev = 15;

            _loop = function _loop() {
              var commit = _step.value;

              if (commit.tag) {
                if (release.tag || options.unreleased) {
                  releases.push(_objectSpread({}, release, {
                    href: getCompareLink("".concat(options.tagPrefix).concat(commit.tag), release.tag ? "".concat(options.tagPrefix).concat(release.tag) : 'HEAD', remote),
                    commits: sliceCommits(release.commits.sort(sortCommits), options, release),
                    major: !options.tagPattern && commit.tag && release.tag && _semver["default"].diff(commit.tag, release.tag) === 'major'
                  }));
                }

                var summary = getSummary(commit.message, options.releaseSummary);
                release = newRelease(commit.tag, commit.date, summary);
              }

              if (commit.merge) {
                if (filterByGithubLabel) {
                  var issue = githubIssues.find(function (issue) {
                    return issue.number == commit.merge.id;
                  });
                  if (!issue) return "continue";
                  if (!issue.labels.map(function (label) {
                    return label.name;
                  }).includes(options.mergeGithubLabel)) return "continue";
                }

                release.merges.push(commit.merge);
              } else if (commit.fixes) {
                release.fixes.push({
                  fixes: commit.fixes,
                  commit: commit
                });
              } else if (filterCommit(commit, options, release)) {
                release.commits.push(commit);
              }
            };

            _iterator = commits[Symbol.iterator]();

          case 18:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context.next = 25;
              break;
            }

            _ret = _loop();

            if (!(_ret === "continue")) {
              _context.next = 22;
              break;
            }

            return _context.abrupt("continue", 22);

          case 22:
            _iteratorNormalCompletion = true;
            _context.next = 18;
            break;

          case 25:
            _context.next = 31;
            break;

          case 27:
            _context.prev = 27;
            _context.t0 = _context["catch"](15);
            _didIteratorError = true;
            _iteratorError = _context.t0;

          case 31:
            _context.prev = 31;
            _context.prev = 32;

            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }

          case 34:
            _context.prev = 34;

            if (!_didIteratorError) {
              _context.next = 37;
              break;
            }

            throw _iteratorError;

          case 37:
            return _context.finish(34);

          case 38:
            return _context.finish(31);

          case 39:
            releases.push(_objectSpread({}, release, {
              commits: sliceCommits(release.commits.sort(sortCommits), options, release)
            }));
            return _context.abrupt("return", releases);

          case 41:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[15, 27, 31, 39], [32,, 34, 38]]);
  }));
  return _parseReleases.apply(this, arguments);
}

function sortReleases(a, b) {
  var tags = {
    a: inferSemver(a.tag),
    b: inferSemver(b.tag)
  };

  if (tags.a && tags.b) {
    if (_semver["default"].valid(tags.a) && _semver["default"].valid(tags.b)) {
      return _semver["default"].rcompare(tags.a, tags.b);
    }

    if (NUMERIC_PATTERN.test(tags.a) && NUMERIC_PATTERN.test(tags.b)) {
      return parseFloat(tags.a) < parseFloat(tags.b) ? 1 : -1;
    }

    if (tags.a === tags.b) {
      return 0;
    }

    return tags.a < tags.b ? 1 : -1;
  }

  if (tags.a) return 1;
  if (tags.b) return -1;
  return 0;
}

function inferSemver(tag) {
  if (/^v\d+$/.test(tag)) {
    // v1 becomes v1.0.0
    return "".concat(tag, ".0.0");
  }

  if (/^v\d+\.\d+$/.test(tag)) {
    // v1.0 becomes v1.0.0
    return "".concat(tag, ".0");
  }

  return tag;
}

function newRelease() {
  var tag = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
  var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date().toISOString();
  var summary = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  return {
    commits: [],
    fixes: [],
    merges: [],
    tag: tag,
    date: date,
    summary: summary,
    title: tag || 'Unreleased',
    niceDate: (0, _utils.niceDate)(date),
    isoDate: date.slice(0, 10)
  };
}

function sliceCommits(commits, _ref, release) {
  var commitLimit = _ref.commitLimit,
      backfillLimit = _ref.backfillLimit;

  if (commitLimit === false) {
    return commits;
  }

  var emptyRelease = release.fixes.length === 0 && release.merges.length === 0;
  var limit = emptyRelease ? backfillLimit : commitLimit;
  var minLimit = commits.filter(function (c) {
    return c.breaking;
  }).length;
  return commits.slice(0, Math.max(minLimit, limit));
}

function filterCommit(commit, _ref2, release) {
  var ignoreCommitPattern = _ref2.ignoreCommitPattern;

  if (commit.breaking) {
    return true;
  }

  if (ignoreCommitPattern) {
    // Filter out commits that match ignoreCommitPattern
    return new RegExp(ignoreCommitPattern).test(commit.subject) === false;
  }

  if (_semver["default"].valid(commit.subject)) {
    // Filter out version commits
    return false;
  }

  if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
    // Filter out merge commits
    return false;
  }

  if (release.merges.findIndex(function (m) {
    return m.message === commit.subject;
  }) !== -1) {
    // Filter out commits with the same message as an existing merge
    return false;
  }

  return true;
}

function getCompareLink(from, to, remote) {
  if (!remote) {
    return null;
  }

  if (/bitbucket/.test(remote.hostname)) {
    return "".concat(remote.url, "/compare/").concat(to, "..").concat(from);
  }

  if (/dev\.azure/.test(remote.hostname) || /visualstudio/.test(remote.hostname)) {
    return "".concat(remote.url, "/branches?baseVersion=GT").concat(to, "&targetVersion=GT").concat(from, "&_a=commits");
  }

  return "".concat(remote.url, "/compare/").concat(from, "...").concat(to);
}

function getSummary(message, releaseSummary) {
  if (!message || !releaseSummary) {
    return null;
  }

  if (COMMIT_MESSAGE_PATTERN.test(message)) {
    return message.match(COMMIT_MESSAGE_PATTERN)[1];
  }

  return null;
}

function commitSorter(_ref3) {
  var sortCommits = _ref3.sortCommits;
  return function (a, b) {
    if (!a.breaking && b.breaking) return 1;
    if (a.breaking && !b.breaking) return -1;
    if (sortCommits === 'date') return new Date(a.date) - new Date(b.date);
    return b.insertions + b.deletions - (a.insertions + a.deletions);
  };
}