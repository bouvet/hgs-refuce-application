---
title: Deployment
layout: default
nav_order: 6
has_children: true
---

# Deployment

How this app runs outside your own machine: containerized locally, deployed to Azure, and how this
docs site itself gets published.

| Page | Covers |
| --- | --- |
| [Docker]({{ site.baseurl }}/deployment/docker/) | The local `docker-compose.yml` stack, the two Postgres databases, troubleshooting |
| [Azure — Frontend]({{ site.baseurl }}/deployment/azure-frontend/) | Deploying the Next.js app |
| [Azure — Backend]({{ site.baseurl }}/deployment/azure-backend/) | Deploying the FastAPI app |
| [CI/CD]({{ site.baseurl }}/deployment/ci-cd/) | The two GitHub Actions workflows, and how this Pages site publishes (no workflow file) |
