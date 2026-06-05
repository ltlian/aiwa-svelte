FROM node:26-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ARG USERNAME=codex
ARG USER_UID=1001
ARG USER_GID=1001

ENV TERM=xterm-sixel \
    COLORTERM=truecolor \
    SHELL=/bin/bash \
    SANDBOX_USERNAME=${USERNAME}

COPY docker/codex/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/codex/codex-config.toml /usr/local/share/codex/config.toml
COPY docker/codex/xterm-sixel.terminfo /usr/local/share/terminfo/xterm-sixel.terminfo

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      bash \
      bubblewrap \
      build-essential \
      ca-certificates \
      curl \
      git \
      iproute2 \
      jq \
      less \
      ncurses-term \
      openssh-server \
      pkg-config \
      procps \
      python3 \
      python3-pip \
      python3-venv \
      ripgrep \
      sudo \
      tmux \
      unzip \
      vim-tiny \
 && npm install -g @openai/codex@latest \
 && tic -x /usr/local/share/terminfo/xterm-sixel.terminfo \
 && ln -sf /usr/bin/bwrap /usr/bin/bubblewrap \
 && git config --system --add safe.directory /workspace \
 && groupadd --gid "${USER_GID}" "${USERNAME}" \
 && useradd --uid "${USER_UID}" --gid "${USER_GID}" -m -s /bin/bash "${USERNAME}" \
 && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${USERNAME}" \
 && chmod 0440 "/etc/sudoers.d/${USERNAME}" \
 && mkdir -p /run/sshd /workspace "/home/${USERNAME}/.codex" "/home/${USERNAME}/.cache" "/home/${USERNAME}/.npm" \
 && cp /usr/local/share/codex/config.toml "/home/${USERNAME}/.codex/config.toml" \
 && chown -R "${USERNAME}:${USERNAME}" /workspace "/home/${USERNAME}/.codex" "/home/${USERNAME}/.cache" "/home/${USERNAME}/.npm" \
 && chmod 600 "/home/${USERNAME}/.codex/config.toml" \
 && chmod 644 /usr/local/share/codex/config.toml \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

USER ${USERNAME}

RUN codex --version >/dev/null

USER root

EXPOSE 22 5173 4173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/sbin/sshd", "-D", "-e"]
