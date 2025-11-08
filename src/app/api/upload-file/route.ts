import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
import DiscoveryV2 from 'ibm-watson/discovery/v2';
import {IamAuthenticator} from 'ibm-watson/auth';

export async function POST(req: Request) {
    try {
        const form = await req.formData();
        const maybeFile = form.get('file');
        if (!maybeFile) return NextResponse.json({error: 'No file provided'}, {status: 400});

        // The incoming object is a File/Blob
        const file = maybeFile as File;
        const text = await file.text();

        // create Supabase server client
        const supabase = await createClient();

        const bucket = process.env.SUPABASE_UPLOAD_BUCKET ?? 'uploads';
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        // Upload to storage. The storage client accepts Blob/File objects.
        const {error: uploadError} = await supabase.storage
            .from(bucket)
            .upload(safeName, file, {upsert: true});

        if (uploadError) {
            return NextResponse.json({error: uploadError.message}, {status: 500});
        }

        // Get public URL
        const {data: urlData} = supabase.storage.from(bucket).getPublicUrl(safeName);
        const publicUrl = urlData
            ? (urlData as { publicUrl?: string }).publicUrl
            : null;

        // --- Add file to IBM Watson Discovery (DiscoveryV2 SDK) ---
        let watsonResult: unknown = null;
        try {
            const apiKey = process.env.WATSON_API_KEY;
            const serviceUrl = process.env.WATSON_URL ?? 'https://api.us-east.discovery.watson.cloud.ibm.com';
            // DiscoveryV2 expects a projectId; accept WATSON_PROJECT_ID or fall back to WATSON_ENVIRONMENT_ID if present
            const projectId = process.env.WATSON_PROJECT_ID ?? process.env.WATSON_ENVIRONMENT_ID;
            const collId = process.env.WATSON_COLLECTION_ID;
            // Default to today's date (use as the DiscoveryV2 API version) unless overridden
            const apiVersion = process.env.WATSON_API_VERSION ?? '2025-11-08';

            if (apiKey && serviceUrl && projectId && collId) {
                const discovery = new DiscoveryV2({
                    version: apiVersion,
                    authenticator: new IamAuthenticator({apikey: apiKey}),
                    serviceUrl,
                });

                // Convert web File/Blob to Node.js Buffer
                const arrayBuffer = await file.arrayBuffer();
                const nodeBuffer = Buffer.from(arrayBuffer);

                const addParams = {
                    projectId,
                    collectionId: collId,
                    file: nodeBuffer,
                    filename: file.name,
                    fileContentType: file.type || undefined,
                    metadata: JSON.stringify({filename: file.name, uploadedAt: new Date().toISOString()}),
                };

                const addRes = await discovery.addDocument(addParams);
                watsonResult = addRes.result ?? addRes;
                if (!addRes.status || (addRes.status >= 400 && addRes.status !== 201)) {
                    console.error('Watson DiscoveryV2 addDocument returned non-success', addRes);
                } else {
                    console.log('Uploaded document to Watson DiscoveryV2:', addRes.result);
                }
            } else {
                console.warn('Skipping Watson Discovery upload: missing WATSON_* env vars (WATSON_API_KEY, WATSON_PROJECT_ID and WATSON_COLLECTION_ID required)');
            }
        } catch (watsonErr) {
            console.error('Error uploading to Watson Discovery (v2):', watsonErr);
            // Continue -- we don't want Watson failures to break the whole upload flow
        }

        // Call local mock AI service
        const aiUrl = new URL('/api/analyze-text', req.url).toString();
        const aiRes = await fetch(aiUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, fileName: file.name, filePath: publicUrl}),
        });

        const aiJson = await aiRes.json().catch(() => null);
        const ai = aiJson?.result ?? null;

        return NextResponse.json({ok: true, publicUrl, ai, watson: watsonResult});
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({error: msg}, {status: 500});
    }
}
