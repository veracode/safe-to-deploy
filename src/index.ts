import * as core from '@actions/core';
import * as github from '@actions/github';
import { Pull } from './pull';
import { getDecisionEvaluation } from './services/decision-service';


async function run() {
   try {
        const vid = core.getInput("vid");
        const vkey = core.getInput("vkey");
        const token = core.getInput("github_token");
        const owner = core.getInput("repository_owner");
        const repo = core.getInput("repository_name");
        const decision_mode = core.getInput("decision_mode");
        const branch = core.getInput("source_branch");
        const businessId = core.getInput("businessId");
        const businessVersion = core.getInput("businessVersion");
        const repository = core.getInput("repository");
        const artifacts_list = core.getInput("artifacts_list");
        const pull_number = core.getInput("pull_request");
        const octokit = github.getOctokit(token);
        console.log(JSON.stringify(pull_number));
        const eventName = github.context.eventName;
        console.log(eventName);
        if (eventName === "pull_request") {
            console.log("Triggered by Pull Request");
            Pull.setFn(core, octokit, owner, repo, branch, artifacts_list, repository, decision_mode, pull_number, businessId);

        }else if (eventName === "push"  || eventName === "workflow_dispatch" || true) {
            console.log("Triggered by Push");
            const response = await getDecisionEvaluation(vid, vkey, {
                "type": "Deployment",
                "target": "Prod",
                "scope": [
                    {
                    "businessApplicationId": businessId,
                    "businessApplicationVersion": businessVersion,
                    "assetSnapshotIds": artifacts_list.split(",")
                    }
                ]

            });

            let conclusion = "failure";
            let summary = "";

            if ('result' in response && response.result === "SAFE") {
                conclusion = "success";
                summary = `✅ SAFE to deploy\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}`;
                core.info("Veracode Deploy Decision: Allow");
                console.log("Veracode Deploy Decision: Allow");
            } else {
                if ('result' in response && response.result === "UNSAFE" && decision_mode === "observer") {
                    conclusion = "neutral";
                    summary = `⚠️ UNSAFE (Observer Mode - Allowed)\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}\nMode: Observer`;
                    core.info("Veracode Deploy Decision: Observer Mode: Allow");
                    console.log("Veracode Deploy Decision: Observer Mode: Allow");
                } else if ('result' in response && response.result === "UNSAFE") {
                    conclusion = "failure";
                    summary = `❌ UNSAFE (Enforcement Mode - Blocked)\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}\nMode: Enforcement`;
                    core.setFailed("Veracode Deploy Decision: Deny");
                    console.log("Veracode Deploy Decision: Deny");
                } else if ('error' in response) {
                    conclusion = "failure";
                    summary = `❌ Error evaluating deployment\n\nError: ${response.message}\nStatus: ${response.status}\nTimestamp: ${response.timestamp}`;
                    core.setFailed(`Veracode Deploy Decision Error: ${response.message}`);
                    console.log(`Veracode Deploy Decision Error: ${response.message}`);
                }
            }

            core.setOutput("conclusion", conclusion);
            core.setOutput("summary", summary);
        }

    } catch (error: any) {
        core.setFailed("Error in Pipeline: " + error.message);
    }
}

run();