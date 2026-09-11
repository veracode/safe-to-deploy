export declare function getbranchDetail(octokit: any, owner: string, repo: string, branch: string): Promise<any>;
export declare function getCommitCheckRuns(octokit: any, owner: string, repo: string, sha: string): Promise<any>;
export declare function getCheckRunDetails(octokit: any, owner: string, repo: string, check_run_id: number): Promise<any>;
export declare function addCommentToPullRequest(octokit: any, githubDetails: GithubDetails, pull_number: number, comment: string): Promise<any>;
