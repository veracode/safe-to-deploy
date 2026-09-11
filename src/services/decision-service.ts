import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from "../namespaces/TrustAuthorityDecision";
import * as http from '../api/http-request';
import { postDecisionEvaluation } from "../api/http-request";

export async function getDecisionEvaluation(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise <DecisionEvaluationResponse | ErrorResponse> {
    return await postDecisionEvaluation(vid, vkey, decisionRequest);
}

export  function generatePullRequestComment(result:DecisionEvaluationResponse): string {
    if(result.result === "SAFE") {
        const score = "90%";
        return `# ![Veracode](https://www.veracode.com/wp-content/themes/berg-theme-child/assets/images/favicon/favicon-32x32.png) Safe to Deploy\n## Veracode Trust Authority   ![95%](https://img.shields.io/badge/TRUST%20SCORE-${score}25-2ea44f)\nThe application was automatically approved deployment to a production environment because all the assets pass the required policy gate.`;
    } else if(result.result === "UNSAFE") {
        const score = "10%";
        return `# ![Veracode](https://www.veracode.com/wp-content/themes/berg-theme-child/assets/images/favicon/favicon-32x32.png) Unsafe to Deploy\n## Veracode Trust Authority   ![${score}%](https://img.shields.io/badge/TRUST%20SCORE-${score}25-red)\nThe application was automatically blocked from deployment to a production environment because one or more assets failed the required policy gate.`;
    } else {
        const score = "10%";
        return `# ![Veracode](https://www.veracode.com/wp-content/themes/berg-theme-child/assets/images/favicon/favicon-32x32.png) Error evaluating deployment\n## Veracode Trust Authority   ![${score}%](https://img.shields.io/badge/TRUST%20SCORE-${score}25-red)\nAn error occurred while evaluating the deployment decision. Please check the logs for more details.`;
    }
    
}