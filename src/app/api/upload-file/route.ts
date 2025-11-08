import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';

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

        // Call local mock AI service
        const aiUrl = new URL('/api/analyze-text', req.url).toString();
        const aiRes = await fetch(aiUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, fileName: file.name, filePath: publicUrl}),
        });

        const aiJson = await aiRes.json().catch(() => null);
        const ai = aiJson?.result ?? null;

        return NextResponse.json({ok: true, publicUrl, ai});
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({error: msg}, {status: 500});
    }
}
