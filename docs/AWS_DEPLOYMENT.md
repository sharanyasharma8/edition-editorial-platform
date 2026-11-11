# AWS deployment — EDITION

EDITION includes Terraform for an ECS Fargate deployment. The repository does **not** provision AWS resources by itself: the workflow is manual and must be configured with an AWS account, network, remote state bucket, OIDC role and domain/TLS settings first. No AWS deployment has been executed from this development environment.

## Architecture provisioned by Terraform

- Application Load Balancer in two or more public subnets.
- Next.js web container and FastAPI AI sidecar in ECS Fargate using `awsvpc`.
- RDS PostgreSQL in private subnets with encryption and backups.
- ElastiCache Redis with in-transit and at-rest encryption and AUTH.
- Private, versioned S3 media bucket delivered through CloudFront Origin Access Control.
- ECR repositories with immutable tags and scan-on-push.
- Secrets Manager values for database URL, Redis URL, session secret, cron secret, AI service token and seeded demo credentials.
- CloudWatch log groups and an EventBridge scheduled-publishing task.

The AI service is a sidecar in the same Fargate task and is not exposed through the public load balancer. The ALB health check uses `/api/health`, which now checks PostgreSQL and Redis readiness; `/api/health/live` is a separate process liveness probe.

## Prerequisites

1. An AWS account and a dedicated deployment role assumed with GitHub Actions OIDC. Avoid long-lived AWS access keys. The role needs the permissions to manage the resources in `infra/aws/terraform`, push to ECR and pass the ECS task/execution roles. Apply least privilege for the target account and environment.
2. A VPC with at least two public subnets in separate Availability Zones and at least two private subnets in separate Availability Zones. Public subnets must route to an Internet Gateway. Private subnets need outbound access through NAT or suitable VPC endpoints for ECR (API + DKR), S3, CloudWatch Logs, Secrets Manager and other required AWS APIs. The app, RDS and Redis security groups are created by this Terraform stack.
3. An S3 bucket for Terraform state, created separately. Enable bucket versioning and server-side encryption; restrict access to the deployment role and use S3 state locking (`use_lockfile=true`). The backend bucket is intentionally not self-created by this stack.
4. For production, a domain and an ACM certificate in the same region as the ALB, plus DNS records pointing the domain to the ALB. Set the website URL and certificate ARN in repository/environment variables. The deployment workflow blocks a production apply unless the certificate ARN is set and the canonical website URL uses HTTPS. Staging may use an HTTP-only smoke-test endpoint; do not use that mode for a public production site.
5. Review estimated costs before deployment. Fargate, ALB, RDS, ElastiCache, NAT, CloudFront, ECR, Secrets Manager and CloudWatch can incur charges. The default database/cache sizes are small but are not free.

## GitHub configuration

Create these **repository or environment secrets**:

- `AWS_DEPLOY_ROLE_ARN` — IAM role ARN trusted by GitHub Actions OIDC for this repository.
- `TF_STATE_BUCKET` — pre-created S3 bucket name for remote Terraform state.
- `EDITION_VPC_ID` — VPC ID.
- `EDITION_PUBLIC_SUBNET_IDS` — JSON list, e.g. `["subnet-11111111", "subnet-22222222"]`.
- `EDITION_PRIVATE_SUBNET_IDS` — JSON list of private subnet IDs.

The GitHub Environment must also contain (or inherit) these variables and secrets. Configure the AWS IAM OIDC identity provider for `token.actions.githubusercontent.com`; its audience must be `sts.amazonaws.com`. A minimal trust-policy subject can be scoped to the two environment names above.

Create these **repository or environment variables**:

- `AWS_REGION` — defaults to `ap-south-1`.
- `EDITION_SITE_URL` — canonical HTTPS URL, e.g. `https://edition.example.com`.
- `EDITION_CERTIFICATE_ARN` — ACM certificate ARN in the same AWS region as the ALB.
- `EDITION_AI_PROVIDER` — `demo` by default; use `openai` only after approving provider/privacy/cost settings.
- `EDITION_AI_EXTERNAL_PROCESSING_ENABLED` — defaults to `false`; set to `true` only after privacy/legal review. Editors must still provide explicit consent per request.
- `EDITION_OPENAI_SECRET_ARN` — optional Secrets Manager ARN containing `OPENAI_API_KEY` (required only for provider-backed OpenAI use).
- `EDITION_EDITOR_EMAIL` and `EDITION_AUTHOR_EMAIL` — initial CMS identities.

Create GitHub Environments named `staging` and `production` and add the appropriate environment-scoped variables/secrets. The workflow targets the selected environment; require manual approval for `production`. Its OIDC trust policy should scope `sub` to `repo:OWNER/REPOSITORY:environment:staging` and `repo:OWNER/REPOSITORY:environment:production` rather than allow arbitrary repositories. The workflow uses Terraform's S3 native lock file and requires Terraform 1.10+. The state bucket must already exist and be versioned.

## Deploy

1. Review `infra/aws/terraform/main.tf`, variables and the permissions granted to the deployment role.
2. Configure the prerequisites and GitHub secrets/variables above.
3. Open **Actions → Deploy EDITION to AWS → Run workflow**. Choose `staging` or `production`. The workflow creates ECR repositories, builds and pushes immutable images tagged with the commit SHA, then plans and applies the Terraform stack.
4. Review the Terraform plan and AWS cost/security implications before enabling production use. For sensitive production, use a protected GitHub environment and require approval for the apply step.
5. After deployment, retrieve the editor/author initial passwords using the Secret Manager ARNs printed by the workflow. Never put secret values in GitHub logs or commit them to the repository. Rotate credentials after first login.
6. Configure DNS for the ALB, confirm the ACM certificate, then verify the website, health check, CMS sign-in, database, Redis, AI sidecar and scheduled-publishing task.

## Operational cautions

- ECS tasks run in private subnets with no public IP. Missing NAT/VPC endpoints prevents image pulls, secret retrieval, logs or scheduled task egress. AWS documents the ECR, S3, Secrets Manager and CloudWatch connectivity requirements in its [ECS VPC endpoint guidance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/vpc-endpoints.html) and [Fargate networking guidance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html).
- The initial ECS web container runs `prisma migrate deploy` and the idempotent seed before starting Next.js. For high-availability multi-task rollout, move migration/seed into a dedicated one-off release task with deployment orchestration rather than running it in every new web task.
- Scheduled publishing runs every five minutes. Verify EventBridge, ECS task, NAT/ALB reachability and the `CRON_SECRET`-protected endpoint in CloudWatch before relying on it.
- `DEMO_EDITOR_PASSWORD` and `DEMO_AUTHOR_PASSWORD` are random Secrets Manager values created by Terraform. Retrieve them securely and rotate them. The application database stores scrypt password hashes.
- No custom domain, certificate, AWS account, cloud resources or live URL is included in this source snapshot.
