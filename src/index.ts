import * as core from '@actions/core';
import * as github from '@actions/github';

import { generatePullRequestComment, getDecisionEvaluation } from './services/decision-service';
import { CreateDecisionRequest } from './namespaces/TrustAuthorityDecision';
import { addCommentToPullRequest } from './services/github-services';


async function run() {
   try {
        const vid = core.getInput("vid");
        const vkey = core.getInput("vkey");
        const businessId = core.getInput("businessId");
        const businessVersion = core.getInput("businessVersion");
        const artifacts_list = core.getInput("artifacts_list");
        const decision_mode = core.getInput("decision_mode");
        
        const token = core.getInput("github_token");
        const owner = core.getInput("repository_owner");
        const repo = core.getInput("repository_name");
        const branch = core.getInput("source_branch");
        const pull_number = core.getInput("pull_request");

        const eventName = github.context.eventName;
        
        console.log(eventName);
        const decisionRequest : CreateDecisionRequest = {
                "type": "Deployment",
                "target": "Prod",
                "scope": [
                    {
                    "businessApplicationId": businessId,
                    "businessApplicationVersion": businessVersion,
                    "assetSnapshotIds": artifacts_list.split(",")
                    }
                ]
        };
        const response = await getDecisionEvaluation(vid, vkey, decisionRequest);
        if (eventName === "pull_request" || eventName === "push" || eventName === "workflow_dispatch") {
            
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
            if(eventName === "pull_request" && pull_number && 'result' in response) {
                const comment = generatePullRequestComment(response);
                await addCommentToPullRequest(github.getOctokit(token), {owner, repo, branch}, parseInt(pull_number), comment);

            }

            core.setOutput("conclusion", conclusion);
            core.setOutput("summary", summary);
        }

    } catch (error: any) {
        core.setFailed("Error in Pipeline: " + error.message);
    }
}

run();