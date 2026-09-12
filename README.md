# Veracode: Safe to Deploy - Github Action

A GitHub Action that evaluates a deployment request against Veracode and returns a decision that can either block the deployment or allow it in observer mode.

## Overview

This action:

- Sends a deployment decision request to Veracode using the provided API credentials
- Evaluates the supplied business application and asset snapshot IDs
- Returns a deployment outcome via action outputs
- Optionally posts a pull request comment when the workflow is triggered by a pull request

## Inputs

| Name | Required | Description |
| --- | --- | --- |
| `vid` | Yes | Veracode API ID |
| `vkey` | Yes | Veracode API Key |
| `github_token` | Yes | GitHub token provided by the GitHub app via `github.event.client_payload.token` |
| `businessId` | Yes | UUID identifier of the Business Application |
| `businessVersion` | Yes | Version of the Business Application to be deployed |
| `artifacts_list` | Yes | Comma-separated list of asset snapshot IDs to evaluate |
| `decision_mode` | Yes | `observer` to allow unsafe deployments while recording the verdict, or `enforcement` to block unsafe deployments |
| `repository_owner` | Yes | Repository owner of the original commit |
| `repository_name` | Yes | Repository name of the original commit |
| `source_branch` | Yes | Source branch of the pull request |
| `pull_request` | No | Pull request number |

## Outputs

| Name | Description |
| --- | --- |
| `conclusion` | Decision outcome: `success` for SAFE, `failure` for UNSAFE in enforcement mode, or `neutral` for UNSAFE in observer mode |
| `summary` | Summary of the decision details |

## Decision behavior

The action evaluates the deployment request and then applies the following logic:

- If the decision result is `SAFE`, the action marks the run as successful.
- If the decision result is `UNSAFE` and `decision_mode` is `observer`, the action marks the outcome as `neutral` and continues.
- If the decision result is `UNSAFE` and `decision_mode` is not `observer`, the action marks the run as failed and blocks the deployment.
- If the Veracode request itself fails, the action marks the run as failed and surfaces the returned error details.

## Example usage

```yaml
- name: Veracode Safe to Deploy
  id: safe_to_deploy
  uses: your-org/veracode-safe-to-deploy@main
  with:
    vid: ${{ secrets.VERACODE_API_ID }}
    vkey: ${{ secrets.VERACODE_API_KEY }}
    github_token: ${{ github.event.client_payload.token }}
    businessId: ${{ vars.BUSINESS_ID }}
    businessVersion: ${{ github.sha }}
    artifacts_list: ${{ vars.ARTIFACTS_LIST }}
    decision_mode: observer
    repository_owner: ${{ github.event.client_payload.repository.owner }}
    repository_name: ${{ github.event.client_payload.repository.name }}
    source_branch: ${{ github.head_ref || github.ref_name }}
    pull_request: ${{ github.event.pull_request.number }}
```

## Pull request comments

When the workflow runs for a `pull_request` event and the decision response is available, the action will add a pull request comment with the generated decision summary.

## Runtime

This action uses:

- `runs.using: node24`
- `main: dist/index.js`

## Architecture

```text
GitHub Action (veracode/safe-to-deploy@vx.x.x)
      │
      ▼
 HTTP Request
      │
      ▼
 Veracode API
      │
      ▼
 Decision Response
      │
      ▼
 Evaluate Policy
      │
   ┌──┴──┐
   ▼     ▼
SAFE  UNSAFE
   │     │
   ▼     ▼
Allow  Block / Observer
```