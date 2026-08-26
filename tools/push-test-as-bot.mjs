import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const APP_ID = "4720760";
const OWNER = "spokanemyo";
const REPOSITORY = "spokane-myo-website";
const TARGET_BRANCH = "test";
const EXPECTED_REMOTE = `https://github.com/${OWNER}/${REPOSITORY}.git`;
const KEY_FILE = join(
  process.env.LOCALAPPDATA ?? "",
  "SpokaneMyo",
  "secrets",
  "spokanemyo-test-bot.private-key.pem",
);

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "Git command failed.").trim();
    throw new Error(detail);
  }

  return result.stdout.trim();
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function createAppJwt(privateKey) {
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ iss: APP_ID, iat: issuedAt, exp: issuedAt + 9 * 60 }),
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
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

async function getInstallationToken(privateKey) {
  const jwt = createAppJwt(privateKey);
  const installation = await githubRequest(
    `/repos/${OWNER}/${REPOSITORY}/installation`,
    `Bearer ${jwt}`,
  );
  const credentials = await githubRequest(
    `/app/installations/${installation.id}/access_tokens`,
    `Bearer ${jwt}`,
    { method: "POST" },
  );

  if (typeof credentials.token !== "string" || credentials.token.length === 0) {
    throw new Error("GitHub did not return an installation token.");
  }

  return credentials.token;
}

async function main() {
  if (!process.env.LOCALAPPDATA) {
    throw new Error("LOCALAPPDATA is unavailable; the secure key location cannot be resolved.");
  }

  const branch = runGit(["branch", "--show-current"]);
  if (branch !== TARGET_BRANCH) {
    throw new Error(`Refusing to push from '${branch || "detached HEAD"}'. Check out '${TARGET_BRANCH}' first.`);
  }

  const remote = runGit(["remote", "get-url", "origin"]);
  if (remote !== EXPECTED_REMOTE) {
    throw new Error(`Refusing unexpected origin remote: ${remote}`);
  }

  const privateKey = await readFile(KEY_FILE, "utf8");
  const token = await getInstallationToken(privateKey);
  const basicCredential = Buffer.from(`x-access-token:${token}`).toString("base64");
  const env = {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basicCredential}`,
    GIT_TERMINAL_PROMPT: "0",
  };

  const result = spawnSync(
    "git",
    ["push", "origin", `HEAD:refs/heads/${TARGET_BRANCH}`],
    { cwd: process.cwd(), encoding: "utf8", env },
  );

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "Git push failed.").trim());
  }

  process.stdout.write(`Pushed ${TARGET_BRANCH} using SpokaneMyo Test Bot.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
