#!/usr/bin/env bash
set -u

HELP='detect-git-env.sh — Detect git repository environment.

Usage:
  detect-git-env.sh
  detect-git-env.sh --help
'

if [ "${1-}" = "--help" ] || [ "${1-}" = "-h" ]; then
  printf '%s' "$HELP"
  exit 0
fi

if [ "$#" -gt 0 ]; then
  printf 'Error: unknown argument: %s\n' "$1" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf 'Error: git command not found\n' >&2
  exit 1
fi

json_escape() {
  local value="${1-}"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

json_string_or_null() {
  local value="${1-}"
  if [ -z "$value" ]; then
    printf 'null'
    return
  fi
  printf '"%s"' "$(json_escape "$value")"
}

neutral_payload() {
  printf '{\n'
  printf '  "isWorktree": false,\n'
  printf '  "isBareRepo": false,\n'
  printf '  "currentBranch": null,\n'
  printf '  "worktreePath": null,\n'
  printf '  "gitRoot": null,\n'
  printf '  "worktrees": []\n'
  printf '}\n'
}

current_directory=$(pwd -P)
if [ -n "${GIT_CEILING_DIRECTORIES-}" ]; then
  OLD_IFS=$IFS
  IFS=':'
  for ceiling_dir in $GIT_CEILING_DIRECTORIES; do
    if [ -z "$ceiling_dir" ]; then
      continue
    fi
    resolved_ceiling=$(cd "$ceiling_dir" 2>/dev/null && pwd -P)
    if [ -n "$resolved_ceiling" ] && [ "$current_directory" = "$resolved_ceiling" ] && [ ! -e "$current_directory/.git" ]; then
      neutral_payload
      exit 0
    fi
  done
  IFS=$OLD_IFS
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  neutral_payload
  exit 0
fi

is_bare_repo=$(git rev-parse --is-bare-repository 2>/dev/null || printf 'false')
current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || printf '')
git_root=''
worktree_path=''
is_worktree='false'
current_worktree_resolved=''

if [ "$is_bare_repo" = 'true' ]; then
  git_root=$(git rev-parse --absolute-git-dir 2>/dev/null || printf '')
else
  git_root=$(git rev-parse --show-toplevel 2>/dev/null || printf '')
  worktree_path="$git_root"
  if [ -n "$worktree_path" ]; then
    current_worktree_resolved=$(cd "$worktree_path" 2>/dev/null && pwd -P)
  fi
  absolute_git_dir=$(git rev-parse --absolute-git-dir 2>/dev/null || printf '')
  common_dir_arg=$(git rev-parse --git-common-dir 2>/dev/null || printf '')
  common_dir=''
  if [ -n "$common_dir_arg" ]; then
    common_dir=$(cd "$common_dir_arg" 2>/dev/null && pwd -P)
  fi
  if [ -n "$absolute_git_dir" ] && [ -n "$common_dir" ] && [ "$absolute_git_dir" != "$common_dir" ]; then
    # Guard: GIT_DIR != GIT_COMMON-DIR is also true inside git submodules.
    # Check --show-superproject-working-tree; if non-empty, we are in a submodule — treat as normal repo.
    superproject=$(git rev-parse --show-superproject-working-tree 2>/dev/null || printf '')
    if [ -z "$superproject" ]; then
      is_worktree='true'
    fi
  fi
fi

worktrees_json='['
worktrees_separator=''
worktree_entry_path=''
worktree_entry_branch=''

append_worktree() {
  if [ -z "$worktree_entry_path" ]; then
    return
  fi
  local resolved_path
  resolved_path=$(cd "$worktree_entry_path" 2>/dev/null && pwd -P)
  if [ -z "$resolved_path" ]; then
    resolved_path="$worktree_entry_path"
  fi
  local current_flag='false'
  if [ -n "$current_worktree_resolved" ] && [ "$resolved_path" = "$current_worktree_resolved" ]; then
    current_flag='true'
  fi
  worktrees_json+="$worktrees_separator{\"path\":\"$(json_escape "$resolved_path")\",\"branch\":"
  if [ -n "$worktree_entry_branch" ]; then
    worktrees_json+="\"$(json_escape "$worktree_entry_branch")\""
  else
    worktrees_json+='null'
  fi
  worktrees_json+=",\"isCurrentWorktree\":$current_flag}"
  worktrees_separator=','
}

worktree_list=$(git worktree list --porcelain 2>/dev/null || printf '')
if [ -n "$worktree_list" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      worktree\ *)
        append_worktree
        worktree_entry_path=${line#worktree }
        worktree_entry_branch=''
        ;;
      branch\ refs/heads/*)
        worktree_entry_branch=${line#branch refs/heads/}
        ;;
      branch\ *)
        worktree_entry_branch=${line#branch }
        ;;
      detached)
        worktree_entry_branch=''
        ;;
      '')
        append_worktree
        worktree_entry_path=''
        worktree_entry_branch=''
        ;;
    esac
  done <<EOF
$worktree_list
EOF
  append_worktree
fi
worktrees_json+=']'

printf '{\n'
printf '  "isWorktree": %s,\n' "$is_worktree"
printf '  "isBareRepo": %s,\n' "$is_bare_repo"
printf '  "currentBranch": %s,\n' "$(json_string_or_null "$current_branch")"
printf '  "worktreePath": %s,\n' "$(json_string_or_null "$worktree_path")"
printf '  "gitRoot": %s,\n' "$(json_string_or_null "$git_root")"
printf '  "worktrees": %s\n' "$worktrees_json"
printf '}\n'
exit 0
