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
      steps {
        sh 'docker build -t task-manager-backend:$BUILD_NUMBER -t task-manager-backend:latest ./backend'
        sh 'docker build -t task-manager-frontend:$BUILD_NUMBER -t task-manager-frontend:latest ./frontend'
      }
    }

    stage('Deploy to AWS EC2') {
      steps {
        echo 'Placeholder: no EC2 instance provisioned yet. Once one exists, ' +
             'this stage will copy docker-compose.yml + the images built above ' +
             'to the instance (e.g. via SSH/docker context) and run `docker ' +
             'compose up -d` there.'
      }
    }
  }
}
