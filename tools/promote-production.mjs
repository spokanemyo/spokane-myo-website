import { createSign } from "node:crypto";

const OWNER = "spokanemyo";
const REPOSITORY = "spokane-myo-website";
const SOURCE_BRANCH = "test";
const TARGET_BRANCH = "main";
const AUTHORIZED_ACTORS = new Set(["janderson133"]);
const API_VERSION = "2022-11-28";

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment value '${name}' is unavailable.`);
  }
  return value;
}

function assertCommitSha(value, label) {
  if (!/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`${label} is not a full Git commit SHA.`);
  }
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function createAppJwt(appId, privateKey) {
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ iss: appId, iat: issuedAt, exp: issuedAt + 9 * 60 }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
}

async function githubRequest(path, authorization, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization,
      "X-GitHub-Api-Version": API_VERSION,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(
      `GitHub API request failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  if (response.status === 204) {
    return undefined;
  }
  return response.json();
}

async function getInstallationToken(appId, privateKey) {
  const jwt = createAppJwt(appId, privateKey);
  const installation = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/installation`,
    `Bearer ${jwt}`,
  );
  const credentials = await githubRequest(
    `/app/installations/${installation.id}/access_tokens`,
    `Bearer ${jwt}`,
    {
      method: "POST",
      body: JSON.stringify({
        repositories: [REPOSITORY],
        permissions: {
          checks: "read",
          contents: "write",
          pull_requests: "write",
        },
      }),
    },
  );

  if (typeof credentials.token !== "string" || credentials.token.length === 0) {
    throw new Error("GitHub did not return a production promoter token.");
  }
  return credentials.token;
}

async function getBranchSha(token, branch) {
  const reference = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${branch}`,
    `Bearer ${token}`,
  );
  const sha = reference?.object?.sha;
  assertCommitSha(sha, `${branch} branch revision`);
  return sha;
}

async function requireLinearPromotion(token, mainSha, testSha) {
  const comparison = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/compare/${mainSha}...${testSha}`,
    `Bearer ${token}`,
  );
  if (
    comparison.status !== "ahead" ||
    comparison.behind_by !== 0 ||
    comparison.merge_base_commit?.sha !== mainSha
  ) {
    throw new Error(
      "Refusing promotion because test is not strictly ahead of main. Reconcile the branches on test first.",
    );
  }
}

async function requireSuccessfulBuild(token, testSha) {
  const checks = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/commits/${testSha}/check-runs?check_name=build&filter=latest&per_page=100`,
    `Bearer ${token}`,
  );
  const successfulBuild = checks.check_runs?.some(
    (check) =>
      check.name === "build" &&
      check.status === "completed" &&
      check.conclusion === "success",
  );
  if (!successfulBuild) {
    throw new Error(
      `Refusing promotion because GitHub has no successful 'build' check for ${testSha}.`,
    );
  }
}

async function getOrCreatePromotionPullRequest(token, testSha) {
  const openPulls = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/pulls?state=open&base=${TARGET_BRANCH}&head=${OWNER}:${SOURCE_BRANCH}&per_page=10`,
    `Bearer ${token}`,
  );
  if (openPulls.length > 1) {
    throw new Error("Refusing promotion because multiple test-to-main pull requests are open.");
  }
  if (openPulls.length === 1) {
    if (openPulls[0].head?.sha !== testSha) {
      throw new Error("The existing promotion pull request does not match the verified test revision.");
    }
    return openPulls[0];
  }

  const runUrl = `https://github.com/${OWNER}/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  return githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/pulls`,
    `Bearer ${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `Promote test to production (${testSha.slice(0, 7)})`,
        head: SOURCE_BRANCH,
        base: TARGET_BRANCH,
        body: [
          "Human-initiated production promotion.",
          "",
          `Verified test revision: \`${testSha}\``,
          `Workflow run: ${runUrl}`,
          "",
          "The protected production workflow built this exact revision before opening this PR.",
        ].join("\n"),
        maintainer_can_modify: false,
      }),
    },
  );
}

async function mergePromotionPullRequest(token, pullRequest, testSha) {
  const merge = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/pulls/${pullRequest.number}/merge`,
    `Bearer ${token}`,
    {
      method: "PUT",
      body: JSON.stringify({
        sha: testSha,
        merge_method: "merge",
        commit_title: `Promote test to production (#${pullRequest.number})`,
        commit_message: `Approved by ${process.env.GITHUB_ACTOR} through the protected production workflow.`,
      }),
    },
  );
  if (!merge.merged) {
    throw new Error(`GitHub did not merge the production PR: ${merge.message ?? "unknown reason"}`);
  }
  assertCommitSha(merge.sha, "Production merge revision");
  return merge.sha;
}

async function synchronizeTestBranch(token, mergeSha) {
  await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/git/refs/heads/${SOURCE_BRANCH}`,
    `Bearer ${token}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: mergeSha, force: false }),
    },
  );
}

async function main() {
  const actor = requiredEnvironment("GITHUB_ACTOR");
  const repository = requiredEnvironment("GITHUB_REPOSITORY");
  const ref = requiredEnvironment("GITHUB_REF");
  const expectedTestSha = requiredEnvironment("EXPECTED_TEST_SHA").toLowerCase();
  const appId = requiredEnvironment("PROMOTER_APP_ID");
  const privateKey = requiredEnvironment("PROMOTER_PRIVATE_KEY");

  if (!AUTHORIZED_ACTORS.has(actor)) {
    throw new Error(`GitHub actor '${actor}' is not authorized to promote production.`);
  }
  if (repository !== `${OWNER}/${REPOSITORY}`) {
    throw new Error(`Refusing unexpected repository '${repository}'.`);
  }
  if (ref !== `refs/heads/${TARGET_BRANCH}`) {
    throw new Error(`Production promotion must run from '${TARGET_BRANCH}', not '${ref}'.`);
  }
  assertCommitSha(expectedTestSha, "Verified test revision");

  const token = await getInstallationToken(appId, privateKey);
  const [mainSha, currentTestSha] = await Promise.all([
    getBranchSha(token, TARGET_BRANCH),
    getBranchSha(token, SOURCE_BRANCH),
  ]);

  if (currentTestSha !== expectedTestSha) {
    throw new Error(
      "The test branch changed after validation. Review the new test deployment and run promotion again.",
    );
  }
  if (mainSha === currentTestSha) {
    process.stdout.write("Production is already synchronized with test; no changes were made.\n");
    return;
  }

  await requireLinearPromotion(token, mainSha, currentTestSha);
  await requireSuccessfulBuild(token, currentTestSha);
  const pullRequest = await getOrCreatePromotionPullRequest(token, currentTestSha);

  const testShaBeforeMerge = await getBranchSha(token, SOURCE_BRANCH);
  if (testShaBeforeMerge !== currentTestSha) {
    throw new Error("The test branch changed before merge. No production change was made.");
  }

  const mergeSha = await mergePromotionPullRequest(token, pullRequest, currentTestSha);
  await synchronizeTestBranch(token, mergeSha);

  const [finalMainSha, finalTestSha] = await Promise.all([
    getBranchSha(token, TARGET_BRANCH),
    getBranchSha(token, SOURCE_BRANCH),
  ]);
  if (finalMainSha !== mergeSha || finalTestSha !== mergeSha) {
    throw new Error(
      "Production merged, but branch synchronization verification failed. Inspect GitHub before another promotion.",
    );
  }

  process.stdout.write(
    `Promoted ${currentTestSha} to production as ${mergeSha} and synchronized test.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
