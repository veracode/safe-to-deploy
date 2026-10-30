import * as core from '@actions/core';
import * as github from '@actions/github';

import { generatePullRequestComment, getDecisionEvaluation } from './services/decision-service';
import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from './namespaces/TrustAuthorityDecision';
import { addCommentToPullRequest } from './services/github-services';
import {  getAssetSnapshotIds, getBusinessByName, processArtifactsList } from './services/asset-finding-service';
import { verifyBusinessAppId } from './utils/regex';


async function run() {
    const decision_mode = core.getInput("decision_mode");
   try {
        const vid = core.getInput("vid");
        const vkey = core.getInput("vkey");
        let businessApp = core.getInput("businessApp");
        const businessVersion = core.getInput("businessVersion");
        const artifacts_list = core.getInput("artifacts_list");
        
        const token = core.getInput("github_token");
        const owner = core.getInput("repository_owner");
        const repo = core.getInput("repository_name");
        const branch = core.getInput("source_branch");
        const pull_number = core.getInput("pull_request");
        const eventName = github.context.eventName;
        //const eventName = "pull_request";
        let businessId = verifyBusinessAppId(businessApp) ? businessApp : null;
            
        
        if(businessId != null){
            core.info("Business ID is provided, proceeding with the given Business ID");
        }else if(businessApp){
            core.info("Business Name is provided, fetching Business ID from Veracode");
            const businessIdResponse = await getBusinessByName(vid, vkey, businessApp);
            if(businessIdResponse && 'id' in businessIdResponse && businessIdResponse.id){
                businessId = businessIdResponse.id;
                core.info(`Business ID fetched successfully: ${businessIdResponse.id}`);
                console.log(`Business ID fetched successfully: ${businessIdResponse.id}`);
            }else{
                const reason = businessIdResponse && 'message' in businessIdResponse ? `: ${businessIdResponse.message}` : '';
                core.setFailed(`Failed to fetch Business ID from Veracode for the given Business Name${reason}`)
                return;
            }
        }else{
            core.setFailed("Either Business ID or Business Name must be provided");
            return;
        }

        core.info("Asset Snapshot IDs fetched successfully");
        core.info("Business ID: " + businessId);
        core.info("Business Version: " + businessVersion);
        core.info("Artifacts List: " + artifacts_list);
        core.info("Decision Mode: " + decision_mode);
        core.info("Pull Request Number: " + pull_number);
        core.info("Event Name: " + eventName);


        const assetSnapshotDetails = await processArtifactsList(artifacts_list, github.getOctokit(token));
        const assetSnapshotIds = await getAssetSnapshotIds(vid, vkey, assetSnapshotDetails);
        
        const decisionRequest : CreateDecisionRequest = {
                "type": "Deployment",
                "target": "Prod",
                "scope": [
                    {
                    "businessApplicationId": businessId,
                    "businessApplicationVersion": businessVersion,
                    "assetSnapshotIds": assetSnapshotIds
                    }
                ]
        };
        core.info("Decision Evaluation Request: " + JSON.stringify(decisionRequest));
    
        const response : DecisionEvaluationResponse | ErrorResponse = await getDecisionEvaluation(vid, vkey, decisionRequest);
        core.info("Decision Evaluation Response: " + JSON.stringify(response));
        
        if (eventName === "pull_request" || eventName === "push" || eventName === "workflow_dispatch") {
            
            let conclusion = "failure";
            let summary = "";
            
            if ('result' in response && response.result === "SAFE") {
                conclusion = "success";
                summary = `SAFE to deploy\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}`;
                core.info("Veracode Deploy Decision: Allow");
               
            } else {
                if ('result' in response && response.result === "UNSAFE" && decision_mode === "enforcement") {
                    conclusion = "neutral";
                    summary = `UNSAFE (Observer Mode - Allowed)\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}\nMode: Observer`;
                    core.setFailed("Veracode Deploy Decision: Deny");
                   
                } else if ('result' in response && response.result === "UNSAFE") {
                    conclusion = "failure";
                    summary = `UNSAFE (Enforcement Mode - Blocked)\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}\nMode: Enforcement`;
                    core.info("Veracode Deploy Decision: Deny Observer Mode: Allow");
                    
                } else if ('result' in response && response.result === "INDETERMINATE") {
                    conclusion = "failure";
                    summary = `INDETERMINATE (Decision could not be determined)\n\nThe deployment decision could not be determined for the following request:\n\nType: ${decisionRequest.type}\nTarget: ${decisionRequest.target}\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nArtifacts: ${artifacts_list}\nAsset Snapshot IDs: ${assetSnapshotIds.join(', ')}\nDecision ID: ${response.id}\nTimestamp: ${response.decisionTimestamp}\nMode: ${decision_mode}`;
                    if(decision_mode === "observer"){
                        core.info(`Veracode Deploy Decision: Indeterminate - decision could not be determined for Business Application ${businessId} (Version: ${businessVersion}, Target: ${decisionRequest.target}, Asset Snapshot IDs: ${assetSnapshotIds.join(', ')})`);
                    }else{
                        core.setFailed(`Veracode Deploy Decision: Indeterminate - decision could not be determined for Business Application ${businessId} (Version: ${businessVersion}, Target: ${decisionRequest.target}, Asset Snapshot IDs: ${assetSnapshotIds.join(', ')})`);
                    }

                }else if ('error' in response && response.status === 422) {
                    conclusion = "failure";
                    summary = `Error evaluating deployment (Unprocessable Content)\n\nError: ${response.message}\n\nVerify that the artifacts have been scanned and their asset snapshots belong to the requested business application:\n\nBusiness Application: ${businessId}\nVersion: ${businessVersion}\nArtifacts: ${artifacts_list}\nAsset Snapshot IDs: ${assetSnapshotIds.join(', ')}\nStatus: ${response.status}\nTimestamp: ${response.timestamp}`;
                    const errorMessage = `Veracode Deploy Decision Error: ${response.message} (Business Application: ${businessId}, Asset Snapshot IDs: ${assetSnapshotIds.join(', ')})`;
                    if(decision_mode === "observer"){
                        core.info(errorMessage);
                    }else{
                        core.setFailed(errorMessage);
                    }
                }else if ('error' in response) {
                    conclusion = "failure";
                    summary = `Error evaluating deployment\n\nError: ${response.message}\nStatus: ${response.status}\nTimestamp: ${response.timestamp}`;
                    if(decision_mode === "observer"){
                        core.info(`Veracode Deploy Decision Error: ${response.message}`);
                    }else{
                        core.setFailed(`Veracode Deploy Decision Error: ${response.message}`);
                    }
                    core.info(`Veracode Deploy Decision Error: ${response.message}`);
                }else {
                    conclusion = "failure";
                    summary = `Unexpected response format`;
                    if(decision_mode === "observer"){
                        core.info(`Veracode Deploy Decision Error: ${summary}`);
                    }else{
                        core.setFailed(`Veracode Deploy Decision Error: ${summary}`);
                    }
                    core.info(`Veracode Deploy Decision Error: ${summary}`);
                }
            }
            if(eventName === "pull_request" && pull_number && ('result' in response || ('error' in response && [401, 403, 422].includes(response.status)))) {
                const comment = generatePullRequestComment(response);
                await addCommentToPullRequest(github.getOctokit(token), {owner, repo, branch}, parseInt(pull_number), comment);

            }

            core.setOutput("conclusion", conclusion);
            core.setOutput("summary", summary);
        }

    } catch (error: any) {
        if(decision_mode === "observer"){
            core.info("Error in Pipeline: " + error.message);
        }else{
            core.setFailed("Error in Pipeline: " + error.message);
        }
    }
}

run();