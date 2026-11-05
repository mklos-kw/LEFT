#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

open_url() {
  local url="$1"
  case "$(uname -s)" in
    Darwin) open "$url" ;;
    Linux) xdg-open "$url" &>/dev/null || true ;;
    *) echo "Open this URL manually: $url" ;;
  esac
}

declare -A env_vars
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    env_vars["$key"]="$value"
  done < .env
fi

prompt_if_missing() {
  local key="$1" label="$2"
  if [ -n "${env_vars[$key]:-}" ]; then
    return
  fi
  read -rp "$label: " value
  env_vars["$key"]="$value"
}

if [ -z "${env_vars[ATLASSIAN_CLIENT_ID]:-}" ] || [ -z "${env_vars[ATLASSIAN_CLIENT_SECRET]:-}" ] || [ -z "${env_vars[ATLASSIAN_SITE_URL]:-}" ]; then
  echo "Atlassian OAuth app: https://developer.atlassian.com/console/myapps/"
  echo "  callback URL: http://localhost:5173/auth/atlassian/callback"
  open_url "https://developer.atlassian.com/console/myapps/"
  prompt_if_missing ATLASSIAN_CLIENT_ID "ATLASSIAN_CLIENT_ID"
  prompt_if_missing ATLASSIAN_CLIENT_SECRET "ATLASSIAN_CLIENT_SECRET"
  prompt_if_missing ATLASSIAN_SITE_URL "ATLASSIAN_SITE_URL (e.g. https://your-site.atlassian.net)"
  echo
fi

if [ -z "${env_vars[GITHUB_CLIENT_ID]:-}" ] || [ -z "${env_vars[GITHUB_CLIENT_SECRET]:-}" ]; then
  echo "GitHub OAuth app: https://github.com/settings/developers"
  echo "  callback URL: http://localhost:5173/auth/github/callback"
  open_url "https://github.com/settings/developers"
  prompt_if_missing GITHUB_CLIENT_ID "GITHUB_CLIENT_ID"
  prompt_if_missing GITHUB_CLIENT_SECRET "GITHUB_CLIENT_SECRET"
  echo
fi

if [ -z "${env_vars[SESSION_SECRET]:-}" ]; then
  env_vars[SESSION_SECRET]=$(openssl rand -hex 32)
fi

{
  echo "SESSION_SECRET=${env_vars[SESSION_SECRET]}"
  echo "ATLASSIAN_CLIENT_ID=${env_vars[ATLASSIAN_CLIENT_ID]}"
  echo "ATLASSIAN_CLIENT_SECRET=${env_vars[ATLASSIAN_CLIENT_SECRET]}"
  echo "ATLASSIAN_SITE_URL=${env_vars[ATLASSIAN_SITE_URL]}"
  echo "GITHUB_CLIENT_ID=${env_vars[GITHUB_CLIENT_ID]}"
  echo "GITHUB_CLIENT_SECRET=${env_vars[GITHUB_CLIENT_SECRET]}"
} > .env

echo ".env written."
echo "ready to start"
echo "pnpm dev   # or: docker compose up"
