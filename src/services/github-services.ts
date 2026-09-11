

export async function getbranchDetail(octokit: any, owner: string, repo: string, branch: string) {
    return await octokit.request(`GET /repos/{owner}/{repo}/branches/{branch}`,{  owner,
            repo,
            branch,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });
}

export async function getCommitCheckRuns(octokit: any, owner: string, repo: string, sha: string) {  
    return await octokit.request(`GET /repos/{owner}/{repo}/commits/{sha}/check-runs`,{  owner,
            repo,
            sha,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });
}

export async function getCheckRunDetails(octokit: any, owner: string, repo: string, check_run_id: number) {
    return await octokit.request(`GET /repos/{owner}/{repo}/check-runs/{check_run_id}`,
            {
                owner,
                repo,
                check_run_id,
                headers: {
                    'X-GitHub-Api-Version': '2026-03-10'
                }
            }
        );
}

export async function addCommentToPullRequest(octokit: any,  githubDetails: GithubDetails, pull_number: number, comment: string) {
    const {owner, repo} = githubDetails;
    return await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: comment
    });
}