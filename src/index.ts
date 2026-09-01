import * as core from '@actions/core';
import * as github from '@actions/github';


async function run() {
   try {
        const token = core.getInput("github_token");
        const owner = core.getInput("repository_owner");
        const repo = core.getInput("repository_name");
        const decision_mode = core.getInput("decision_mode");
        const branch = core.getInput("source_branch");
        const repository = core.getInput("repository");
        const artifacts_list = core.getInput("artifacts_list");
        const pull_number = core.getInput("pull_request");
        const octokit = github.getOctokit(token);
        console.log(JSON.stringify(pull_number));
         const branchObj = await octokit.request(`GET /repos/{owner}/{repo}/branches/{branch}`,{  owner,
            repo,
            branch,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });
        

        const sha = branchObj.data.commit?.sha;

        const commits = await octokit.request(`GET /repos/{owner}/{repo}/commits/{sha}/check-runs`,{  owner,
            repo,
            sha,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });
        const check_run_id = commits.data.check_runs?.[0]?.id;
        const checkRunResponse: any = await octokit.request(`GET /repos/{owner}/{repo}/check-runs/{check_run_id}`,
            {
                owner,
                repo,
                check_run_id,
                headers: {
                    'X-GitHub-Api-Version': '2026-03-10'
                }
            }
        );

        const requestBody = {
            "type": "hello",
            "target": "target",
            "scope": [
                {
                "businessApplicationId": "",
                "businessApplicationVersion": "",
                "assetSnapshotIds": artifacts_list.split(",")
                }
            ]
        };
        const checkRunObj = checkRunResponse.data;

        const response = await fetch("https://moocher-uproot-cobbler.ngrok-free.dev/decisions/evaluate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
        });
        let score: number | string;
        let text = '';
        const responseBody = await response.json();
        if(responseBody.verdict === "SAFE" ) {
            checkRunObj.output = {
                title: "Veracode : Safe to Deploy !",
                summary: `Artifacts List: ${artifacts_list}`,
                text: `Repository: ${repository}\nArtifacts List: ${artifacts_list}`,
                images: [
                    {
                         alt: "Safe to Deploy",
                        caption: "Veracode Safe to Deploy",
                        image_url: 'https://www.veracode.com/wp-content/uploads/2025/01/VER-Symbol-Full-Reversed.svg'
                    }
                ]
            };
            core.info("Veracode Deply Decision: Allow");
            score = '95%';
            text = 'Safe to deploy!';
        }else if(responseBody.verdict === "UNSAFE" && decision_mode === "observer") {
            checkRunObj.output = {
                title: "Warning! Unsafe to Deploy, Pipeline is in Observer Mode",
                summary: `Artifacts List: ${artifacts_list}`,
                text: `Repository: ${repository}\nArtifacts List: ${artifacts_list}`
            };
            core.info("Veracode Deply Decision: Observer Mode: Allow");
            score = '95%';
            text = 'Not Safe to deploy!';
        }else{
            checkRunObj.output = {
                title: "Blocking Deplyment! Unsafe to Deploy",
                summary: `Artifacts List: ${artifacts_list}`,
                text: `Repository: ${repository}\nArtifacts List: ${artifacts_list}`
            };
            core.setFailed("Veracode Deploy Decision: Deny");
            score = '15%';
            text = 'Blocking deployment!';
        }
//https://www.veracode.com/wp-content/themes/berg-theme-child/assets/images/favicon/favicon-32x32.png
        const comments = await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: pull_number,
            body: `# ![Veracode](https://www.veracode.com/wp-content/themes/berg-theme-child/assets/images/favicon/favicon-32x32.png) ${text}

## Veracode Trust Authority   ![95%](https://img.shields.io/badge/TRUST%20SCORE-${score}25-2ea44f)

The application was automatically approved deployment to a production environment because all the assets pass the required policy gate.`
        });

        JSON.stringify(comments);

        
        
        const checkRun = await octokit.request(`PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}`, {
            owner,
            repo,
            check_run_id,
            output: checkRunObj.output,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });
        
        core.setOutput("status", responseBody.verdict);
        core.setOutput("summary", `Repository: ${repository}\nArtifacts List: ${artifacts_list}`);

        
    
    } catch (error: any) {
        core.setFailed("Error in Pipeline: " + error.message);
    }
}

run();