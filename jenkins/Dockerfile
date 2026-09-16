# Base Jenkins does not ship the Docker CLI. Pipeline stages later in this
# thesis need to run `docker build` / `docker compose` — this image adds
# just the CLI, not a Docker daemon (see docker-compose.yml: the container
# talks to the HOST's Docker daemon over a mounted socket instead of running
# its own nested one — the "Docker-outside-of-Docker" pattern).
FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS — the pipeline's Build/Test stages run npm directly on
# this controller. A larger multi-project Jenkins would instead use
# ephemeral per-stage Docker agents for this, but that needs a bind mount
# of the Jenkins workspace into a *sibling* container, which requires a
# HOST filesystem path — this Jenkins controller's own workspace lives
# inside a named Docker volume (jenkins_home), which has no such host path
# to hand to a sibling container. Installing Node.js directly here avoids
# that problem entirely for this project's scope.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Preinstall the plugins the pipeline will need, so the first Jenkinsfile
# run doesn't stall on a plugin-install prompt. (workflow-aggregator +
# git are already bundled by the "suggested plugins" setup wizard step;
# these are the ones that specifically aren't.)
RUN jenkins-plugin-cli --plugins \
    docker-workflow \
    htmlpublisher \
    junit

# The image's own default stays the non-root jenkins user; docker-compose.yml
# overrides this to root at container-start time specifically so the
# mounted host docker.sock is accessible (see the comment there).
USER jenkins
