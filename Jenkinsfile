// Pipeline stages (CLAUDE.md "CI/CD PIPELINE STAGES"):
//   Source (GitHub webhook) -> Build -> Run Playwright Tests ->
//   Generate Test Report -> Build Docker Image -> Deploy to AWS EC2
//
// "Source" isn't a stage below — it's Jenkins' own automatic SCM checkout,
// which runs before any Jenkinsfile stage when this job is configured as
// "Pipeline script from SCM" pointed at the GitHub repo (see chat for the
// job setup steps). The GitHub webhook trigger needs a publicly reachable
// Jenkins URL, which this local instance doesn't have yet — for now the
// job is triggered manually ("Build Now"); switching to a webhook later is
// just flipping the job's trigger checkbox once Jenkins has a public URL.
pipeline {
  agent any

  options {
    timestamps()
    // This Jenkinsfile's own containers use fixed host ports (3000/5000 —
    // see docker-compose.yml) and a project name derived from BUILD_NUMBER,
    // not from run-to-run identity, so two builds racing each other would
    // collide on those ports regardless.
    disableConcurrentBuilds()
  }

  environment {
    COMPOSE_PROJECT = "taskmanager-ci-${env.BUILD_NUMBER}"
  }

  stages {
    stage('Build') {
      steps {
        dir('backend') { sh 'npm ci' }
        dir('frontend') { sh 'npm ci' }
        dir('e2e') {
          sh 'npm ci'
          sh 'npx playwright install --with-deps chromium'
        }
      }
    }

    stage('Run Playwright Tests') {
      environment {
        // This Jenkins controller runs inside its OWN container (see
        // jenkins/Dockerfile), so ITS "localhost" is not this host's
        // localhost — it can't see ports the app stack below publishes to
        // the host that way. Docker Desktop's host.docker.internal DNS
        // name resolves to the host machine from inside any container,
        // which is what both the app stack's own build (so the frontend
        // bundle calls the backend at a reachable URL) and the Playwright
        // run below (so its Chromium can load the frontend at all) need to
        // agree on using instead of localhost.
        VITE_API_BASE_URL = 'http://host.docker.internal:5000/api'
        CORS_ORIGIN = 'http://host.docker.internal:3000'
        E2E_FRONTEND_URL = 'http://host.docker.internal:3000'
        E2E_API_URL = 'http://host.docker.internal:5000/api'
        // Throwaway tag (docker-compose.yml's `image:` lines all key off
        // this) so this stage's CI-flavored build — host.docker.internal
        // URLs baked in, only meant for Chromium running inside this same
        // Jenkins container — never overwrites the "latest" tag the
        // "Build Docker Image" stage produces for the real deploy below.
        IMAGE_TAG = "ci-${env.BUILD_NUMBER}"
      }
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT up -d --build'
        // NOT /api/health: that route (app.js) replies without touching the
        // DB at all, so it can say "ready" while the backend's mysql2 pool
        // hasn't made its first real connection yet — a gap that showed up
        // as every single test needing a retry on Jenkins (passing locally
        // every time) even though the app itself has no bug. Hitting
        // /api/auth/login instead forces a real query (findUserWithRoleByEmail)
        // before we proceed, so "ready" here means the whole chain — Express
        // + mysql2 pool + MySQL — actually answered, not just that Express
        // is listening. A bogus login always resolves 401 once the DB
        // round-trip succeeds; anything else (timeout, 502/connection reset)
        // means it's still cold.
        sh '''
          for i in $(seq 1 30); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
              http://host.docker.internal:5000/api/auth/login \
              -H "Content-Type: application/json" \
              -d '{"email":"healthcheck@nonexistent.invalid","password":"x"}')
            if [ "$STATUS" = "401" ]; then
              echo "Backend + DB ready (got 401 from a real DB round-trip)"
              exit 0
            fi
            sleep 2
          done
          echo "Backend/DB never became ready (last status: $STATUS)" >&2
          exit 1
        '''
        dir('e2e') {
          sh 'npx playwright test'
        }
      }
      post {
        always {
          sh 'docker compose -p $COMPOSE_PROJECT down -v'
          sh 'docker rmi taskflow-backend:$IMAGE_TAG taskflow-frontend:$IMAGE_TAG taskflow-mysql:$IMAGE_TAG || true'
        }
      }
    }

    stage('Generate Test Report') {
      steps {
        junit testResults: 'e2e/test-results/junit.xml', allowEmptyResults: true
        publishHTML(target: [
          reportDir: 'e2e/playwright-report',
          reportFiles: 'index.html',
          reportName: 'Playwright HTML Report',
          keepAll: true,
          alwaysLinkToLastBuild: true,
        ])
      }
    }

    stage('Build Docker Image') {
      environment {
        // Baked into the frontend bundle at build time (Vite ARG, see
        // frontend/Dockerfile) — this is the one that actually ships, so it
        // must be the real public HTTPS URL, not a CI/local placeholder.
        // IMAGE_TAG is left at its "latest" default (docker-compose.yml)
        // deliberately: that's the tag the Deploy stage below ships as-is.
        VITE_API_BASE_URL = 'https://52.76.105.50.sslip.io/api'
      }
      steps {
        sh 'docker compose build'
        // Also keep a copy tagged with this build number, purely so
        // `docker images` shows a history to roll back to manually if a
        // deploy ever needs reverting — the Deploy stage itself always
        // ships whatever is tagged "latest".
        sh '''
          docker tag taskflow-backend:latest taskflow-backend:$BUILD_NUMBER
          docker tag taskflow-frontend:latest taskflow-frontend:$BUILD_NUMBER
          docker tag taskflow-mysql:latest taskflow-mysql:$BUILD_NUMBER
        '''
      }
    }

    stage('Deploy to AWS EC2') {
      environment {
        EC2_HOST = '52.76.105.50'
        EC2_USER = 'ubuntu'
        EC2_DIR = '/home/ubuntu/taskflow'
        APP_URL = 'https://52.76.105.50.sslip.io'
      }
      steps {
        // The EC2 instance is a free-tier 1GB-RAM box — building the
        // frontend (npm ci + vite build) directly on it, alongside the
        // already-running mysql/backend/nginx, is what triggered a real
        // kernel OOM-kill of mysqld during manual deployment (see the
        // project notes/report for the incident). Shipping the image
        // Jenkins already built above — instead of the source — means the
        // EC2 host only ever has to `docker load` + `docker compose up`
        // (no --build), which needs far less memory.
        withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
          sh '''
            docker save taskflow-backend:latest taskflow-frontend:latest taskflow-mysql:latest -o taskflow-images.tar
            scp -i $SSH_KEY -o StrictHostKeyChecking=no taskflow-images.tar docker-compose.yml $EC2_USER@$EC2_HOST:$EC2_DIR/
            rm -f taskflow-images.tar
            ssh -i $SSH_KEY -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST '
              set -e
              cd '"$EC2_DIR"'
              docker load -i taskflow-images.tar
              rm -f taskflow-images.tar
              docker compose up -d
              docker image prune -f
            '
          '''
        }
        // Same DB-backed readiness check as the "Run Playwright Tests"
        // stage (see the comment there for why /api/health alone isn't
        // enough), aimed at the real public URL this time.
        sh '''
          for i in $(seq 1 30); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
              $APP_URL/api/auth/login \
              -H "Content-Type: application/json" \
              -d '{"email":"healthcheck@nonexistent.invalid","password":"x"}')
            if [ "$STATUS" = "401" ]; then
              echo "Deploy verified: $APP_URL is up and DB-backed requests work"
              exit 0
            fi
            sleep 2
          done
          echo "Deployed app at $APP_URL did not become ready (last status: $STATUS)" >&2
          exit 1
        '''
      }
    }
  }
}
