import * as core from '@actions/core';
import * as github from '@actions/github';
import { Pull } from './pull';


async function run() {
   try {
        const token = core.getInput("github_token");
        const owner = core.getInput("repository_owner");
        const repo = core.getInput("repository_name");
        const decision_mode = core.getInput("decision_mode");
        const branch = core.getInput("source_branch");
        const businessId = core.getInput("businessId");
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

        }else if (eventName === "push"  || eventName === "workflow_dispatch") {
            console.log("Triggered by Push");
            const requestBody = {
                "type": "Deployment",
                "target": "Prod",
                "scope": [
                    {
                    "businessApplicationId": businessId,
                    "businessApplicationVersion": "",
                    "assetSnapshotIds": artifacts_list.split(",")
                    }
                ]
            };
            console.log("requestBody");
            console.log(JSON.stringify(requestBody ));
            const response = await fetch("https://moocher-uproot-cobbler.ngrok-free.dev/api/v1/evaluate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody)
            });
            const responseBody = await response.json();
            console.log(JSON.stringify(responseBody));
            core.setOutput("response", JSON.stringify(responseBody));
            if(responseBody.result == "SAFE"){
                core.info("Veracode Deply Decision: Allow");
            }else{
                if(responseBody.verdict === "UNSAFE" && decision_mode === "observer"){
                      core.info("Veracode Deply Decision: Observer Mode: Allow");
                }else{
                    core.setFailed("Veracode Deploy Decision: Deny");
                }
                
            }
        }
            
        
        core.setOutput("summary", `Repository: ${repository}\nArtifacts List: ${artifacts_list}`);

        
    
    } catch (error: any) {
        core.setFailed("Error in Pipeline: " + error.message);
    }
}

run();