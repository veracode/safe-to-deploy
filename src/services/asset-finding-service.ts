import { ErrorResponse } from "../namespaces/TrustAuthorityDecision";


import { AssetGroupResponse } from "../namespaces/AssetFinding";
import appConfig from "../app-config";
import { getRequestById } from "../api/http-request";
import { getRefByTag } from "./github-services";

export async function getBusinessByName(vid: string, vkey: string, name: string): Promise <AssetGroupResponse | ErrorResponse> {
    
    
    let responseObj = await getRequestById<{content: AssetGroupResponse[]}>(vid, vkey, appConfig.api.veracode.findingsUri, "/asset-groups" , [{key: "namePattern", value: name},{ key: "nameMatchType", value: "EXACT"}]);

    if ("content" in responseObj) {
        if (!responseObj.content || responseObj.content.length === 0) {
            return {
                timestamp: new Date().toISOString(),
                status: 404,
                error: "Not Found",
                message: `No business application found with name '${name}'`
            } as ErrorResponse;
        }
        return responseObj.content[0];
    }

    const errorBody = responseObj as any;
    const errorStatus = Number(errorBody?.status ?? errorBody?.http_code ?? errorBody?._embedded?.errors?.[0]?.status);
    if (errorStatus === 401 || errorStatus === 403) {
        return {
            timestamp: new Date().toISOString(),
            status: errorStatus,
            error: errorStatus === 401 ? "Unauthorized" : "Forbidden",
            message: "Authorization failed: verify the Veracode API credentials (vid/vkey) and their permissions"
        } as ErrorResponse;
    }

    return {
        message: "Error fetching business by name",
        statusCode: 500,
        error: "Internal Server Error",
        details: "An error occurred while fetching the business by name."
    } as unknown as ErrorResponse;
}

export async function processArtifactsList(input: string, octokit: any): Promise<Array<{ name: string; tag?: string; commitHash?: string }>> {
    if (!input || input.trim() === '') {
        return [];
    }

    return Promise.all(input.split(',').map(async (item) => {
        const trimmed = item.trim();
        const parts = trimmed.split('@');
        const name = parts[0] || '';
        const value = parts[1] || '';

        if (!name || !value) {
            throw new Error(`Invalid artifact format: ${trimmed}. Expected format is name@tag or name@commitHash.`);
        }

        if (value.startsWith('v')) {
            const releaseResponse = await getRefByTag(octokit, name.split("/")[0], name.split("/")[1], value);
            return { name, commitHash:  releaseResponse.data.object.sha};
        } else {

            return { name, commitHash: value };
        }
    }));
}

export async function getAssetSnapshotIds(vid: string, vkey: string, artifacts: Array<{ name: string; tag?: string; commitHash?: string }>): Promise<string[]> {
    const assetSnapshotIdsSet = new Set<string>();
    for (const artifact of artifacts) {

        const response = await getRequestById<{ content: { id: string }[] }>(vid, vkey, appConfig.api.veracode.findingsUri, `/asset-snapshots`, [{key: "metadataKey", value: "commitHash"}, {key: "metadataValue", value: artifact.commitHash || ""}, {key: "matchType", value: "EXACT"}]);
        if ("content" in response && response.content.length > 0) {
            response.content.forEach(item => assetSnapshotIdsSet.add(item.id));
        } else {
            throw new Error(`Failed to fetch asset snapshot ID for ${artifact.name} with commit hash ${artifact.commitHash}`);
        }
    }
    return [...assetSnapshotIdsSet];
}

