# Bakes schema.sql + seed.sql into the image instead of bind-mounting them
# at `docker compose up` time. This matters specifically because Jenkins
# itself runs inside a container (see jenkins/Dockerfile): a bind mount
# path is resolved by the Docker DAEMON against the HOST filesystem, but
# when `docker compose up` is invoked from inside the Jenkins container,
# "./database/schema.sql" only exists inside the Jenkins container's own
# filesystem, not on the host — the daemon would fail to find it (or mount
# an unrelated/empty path). Baking the files into the image instead uses
# `docker build`'s context upload, which works the same way whether the
# client issuing it is on the host or inside another container.
FROM mysql:8.0
COPY schema.sql /docker-entrypoint-initdb.d/1-schema.sql
COPY seed.sql /docker-entrypoint-initdb.d/2-seed.sql
