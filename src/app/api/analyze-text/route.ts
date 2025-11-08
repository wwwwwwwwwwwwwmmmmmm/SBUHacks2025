import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const text = typeof body?.text === 'string' ? body.text : '';
        const fileName = typeof body?.fileName === 'string' ? body.fileName : null;
        const filePath = typeof body?.filePath === 'string' ? body.filePath : null;

        // Create Supabase server client
        const supabase = await createClient();

        // Insert transcript record (bare minimum: file name and path)
        let transcriptId: number | null = null;
        if (fileName || filePath) {
            const {data: tData, error: tError} = await supabase
                .from('transcripts')
                .insert({file_name: fileName ?? 'unknown.txt', file_path: filePath ?? null})
                .select('id')
                .single();

            if (tError) {
                // Log and continue — transcript insertion is important but we still want to demonstrate analysis
                console.error('Failed to insert transcript:', tError.message);
            } else if (tData && typeof tData.id === 'number') {
                transcriptId = tData.id;
            }
        }

        // Call a mocked "neuralseek" service (barebones demo)
        function mockNeuralSeek(inputText: string) {
            const trimmed = inputText.trim();
            const summary = trimmed.length > 0 ? trimmed.slice(0, 280) : 'No text provided';

            // Very naive sentiment-like extraction based on keywords
            const positives = ['good', 'great', 'helpful', 'excellent', 'fast', 'friendly'];
            const negatives = ['bad', 'slow', 'unhelpful', 'rude', 'long', 'wait'];

            const lower = inputText.toLowerCase();
            const positive_feedback: string[] = [];
            const negative_feedback: string[] = [];

            for (const p of positives) {
                if (lower.includes(p)) {
                    positive_feedback.push(p);
                }
            }
            for (const n of negatives) {
                if (lower.includes(n)) {
                    negative_feedback.push(n);
                }
            }

            // Fallback examples if none found
            if (positive_feedback.length === 0 && trimmed.length > 0) positive_feedback.push('service was adequate');
            if (negative_feedback.length === 0 && trimmed.length > 0) negative_feedback.push('no glaring issues found');

            return {summary, positive_feedback, negative_feedback};
        }

        const aiResult = mockNeuralSeek(text);

        // Insert analysis into DB
        let analysisId: number | null = null;
        const {data: aData, error: aError} = await supabase
            .from('analyses')
            .insert({
                transcript_id: transcriptId,
                summary: aiResult.summary,
                positive_feedback: aiResult.positive_feedback,
                negative_feedback: aiResult.negative_feedback,
            })
            .select('id')
            .single();

        if (aError) {
            console.error('Failed to insert analysis:', aError.message);
        } else if (aData && typeof aData.id === 'number') {
            analysisId = aData.id;
        }

        const result = {
            transcriptId,
            analysisId,
            summary: aiResult.summary,
            positive_feedback: aiResult.positive_feedback,
            negative_feedback: aiResult.negative_feedback,
        };

        return NextResponse.json({ok: true, result});
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ok: false, error: msg}, {status: 500});
    }
}
