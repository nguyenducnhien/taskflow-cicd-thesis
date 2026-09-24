#!/bin/bash
# Provisions node_exporter + cAdvisor on the AWS EC2 instance, for the local
# Prometheus (see monitoring/docker-compose.yml) to scrape remotely over
# HTTPS. This is a RECORD of the commands actually run over SSH during
# Giai doan 9 (not meant to be blindly re-run) — kept here because getting
# cAdvisor working took real troubleshooting worth preserving for the
# thesis report. Run manually, section by section, on the EC2 host.
#
# Both exporters bind to 127.0.0.1 only — reachable from outside solely
# through Nginx's /node-metrics and /container-metrics locations (basic-auth
# protected, see the nginx site config on the server), the same
# "Nginx is the one public entry point" pattern used for the app itself.
set -e

# ---------------------------------------------------------------------
# node_exporter — server-level metrics (CPU, RAM, Disk, Network)
# ---------------------------------------------------------------------
NODE_EXPORTER_VERSION="1.9.1"
cd /tmp
curl -fsSL -o node_exporter.tar.gz "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
tar -xzf node_exporter.tar.gz
sudo mv "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/node_exporter
rm -rf node_exporter.tar.gz "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64"

sudo useradd --no-create-home --shell /usr/sbin/nologin node_exporter 2>/dev/null || true

sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<'UNIT'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# ---------------------------------------------------------------------
# cAdvisor — container-level metrics (status, CPU/memory per container)
# ---------------------------------------------------------------------
# v0.49.1 (the then-latest gcr.io tag) could not read ANY per-container
# metrics on this host: it kept failing with "failed to identify the
# read-write layer ID", because this Docker install uses the newer
# containerd-snapshotter storage backend (`docker info` shows
# `driver-type: io.containerd.snapshotter.v1`) instead of the classic
# overlay2 graphdriver cAdvisor's Docker-native code expects at
# /var/lib/docker/image/overlayfs/layerdb/... That path doesn't exist
# under this storage backend, so cAdvisor's Docker factory can't create
# ANY container entries — not a config mistake, a real version gap.
#
# Fix: cAdvisor also has a containerd-native factory (it was originally
# built for Kubernetes/containerd). Docker's own containerd instance runs
# containers under the "moby" namespace, so pointing cAdvisor there
# directly — and disabling the broken Docker factory with --docker=""
# so it doesn't grab (and fail on) the containers first — makes it use
# containerd instead, which works regardless of Docker's storage driver.
# v0.52.1 was needed too; v0.49.1 didn't register a containerd factory
# for docker-managed containers at all even with these flags.
#
# One side effect: without the Docker factory, cAdvisor can't resolve
# containers' friendly Docker Compose names (e.g. "taskflow-backend-1") —
# only their raw container ID. The `image` label (e.g.
# "docker.io/library/taskflow-backend:latest") is used instead throughout
# the Grafana Container dashboard to identify which service is which,
# since it's still unique per service and cAdvisor resolves it correctly.
sudo docker rm -f cadvisor 2>/dev/null || true
sudo docker run -d \
  --name cadvisor \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /dev/disk/:/dev/disk:ro \
  gcr.io/cadvisor/cadvisor:v0.52.1 \
  --docker="" \
  --containerd=/var/run/containerd/containerd.sock \
  --containerd-namespace=moby

# ---------------------------------------------------------------------
# Nginx: expose both exporters (plus the backend's own /metrics) publicly
# over HTTPS, behind HTTP Basic Auth. Add to the server{} block already
# managing / and /api/ (see chat history / project report for the full
# nginx config) — same htpasswd file for all three:
#
#   sudo openssl passwd -apr1 '<password>'   # then put "prometheus:<hash>"
#   in /etc/nginx/.metrics_htpasswd, chmod 644 (nginx runs as www-data,
#   not root — a 640 root:root file was tried first and gave 500s until
#   this was corrected)
#
#   location /node-metrics      { auth_basic ...; proxy_pass http://127.0.0.1:9100/metrics; }
#   location /container-metrics { auth_basic ...; proxy_pass http://127.0.0.1:8080/metrics; }
#   location /app-metrics       { auth_basic ...; proxy_pass http://127.0.0.1:5000/metrics; }
