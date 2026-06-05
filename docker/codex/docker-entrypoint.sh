#!/usr/bin/env bash
set -e

username="${SANDBOX_USERNAME:-codex}"
ssh_dir="/home/${username}/.ssh"
authorized_keys="${ssh_dir}/authorized_keys"
codex_config_dir="/home/${username}/.codex"
codex_config="${codex_config_dir}/config.toml"
codex_config_template="/usr/local/share/codex/config.toml"
sshd_config="/etc/ssh/sshd_config"

mkdir -p /run/sshd "${ssh_dir}" "${codex_config_dir}"
chown "${username}:${username}" "${ssh_dir}" "${codex_config_dir}"
chmod 700 "${ssh_dir}"

if [ ! -f "${codex_config}" ] && [ -f "${codex_config_template}" ]; then
  cp "${codex_config_template}" "${codex_config}"
  chown "${username}:${username}" "${codex_config}"
  chmod 600 "${codex_config}"
fi

sed -i \
  -e '/^#\?PasswordAuthentication /d' \
  -e '/^#\?KbdInteractiveAuthentication /d' \
  -e '/^#\?PermitRootLogin /d' \
  -e '/^PubkeyAuthentication /d' \
  -e '/^AllowUsers /d' \
  -e '/^AcceptEnv /d' \
  -e '/^SetEnv /d' \
  "${sshd_config}"
printf '\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin no\nPubkeyAuthentication yes\nAllowUsers %s\nAcceptEnv LANG LC_* TERM COLORTERM TERM_PROGRAM WT_SESSION KITTY_* WEZTERM_* OPENAI_API_KEY CODEX_*\nSetEnv WT_SESSION=codex-sandbox TERM=xterm-sixel COLORTERM=truecolor FORCE_COLOR=1\n' "${username}" >> "${sshd_config}"

if [ -n "${SSH_PUBLIC_KEY:-}" ]; then
  printf '%s\n' "${SSH_PUBLIC_KEY}" > "${authorized_keys}"
  chown "${username}:${username}" "${authorized_keys}"
  chmod 600 "${authorized_keys}"
else
  echo "Warning: SSH_PUBLIC_KEY is not set; SSH login will not be available." >&2
fi

exec "$@"
