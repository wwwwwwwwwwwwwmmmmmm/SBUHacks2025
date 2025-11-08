import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const text = typeof body?.text === 'string' ? body.text : '';
        const fileName = typeof body?.fileName === 'string' ? body.fileName : null;
        const filePath = typeof body?.filePath === 'string' ? body.filePath : null;

        if (!text.trim()) {
            return NextResponse.json({ok: false, error: 'Missing transcript text'}, {status: 400});
        }

        // Create Supabase server client
        const supabase = await createClient();

        // Insert transcript entry (optional file metadata)
        let transcriptId: number | null = null;
        if (fileName || filePath) {
            const {data: tData, error: tError} = await supabase
                .from('transcripts')
                .insert({
                    file_name: fileName ?? 'unknown.txt',
                    file_path: filePath ?? null,
                })
                .select('id')
                .single();

            if (tError) {
                console.error('❌ Failed to insert transcript:', tError.message);
            } else {
                transcriptId = tData.id;
            }
        }

        // --- CALL NEURALSEEK ---
        const apiKey = process.env.NEURALSEEK_API_KEY;
        if (!apiKey) {
            throw new Error("Missing NEURALSEEK_API_KEY in environment");
        }

        const transcript = text;

        // Use NeuralSeek's `ntl` style payload directly
        const nsBody = {
            ntl: "", // your NeuralSeek template name or leave empty if using raw prompt
            agent: "Parser",
            params: [
                {
                    name: "transcript",
                    value: transcript,
                },
            ],
            options: {
                streaming: false,
                returnVariables: true,
                returnRender: false,
                returnSource: false,
                maxRecursion: 10,
                temperatureMod: 1,
                toppMod: 1,
                freqpenaltyMod: 1,
                timeout: 600000,
            },
        };

        const response = await fetch("https://stagingapi.neuralseek.com/v1/stony18/maistro", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(nsBody),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`NeuralSeek returned ${response.status}: ${errText}`);
        }

        // --- Parse NeuralSeek JSON result directly ---
        const result = await response.json();
        const output = JSON.parse(result.variables.llmOutput)
        // If NeuralSeek returns the object directly (no "answer" wrapping)
        const aiResult = {
            summary: output.summary ?? "",
            positive_feedback: output.positive_feedback ?? [],
            negative_feedback: output.negative_feedback ?? [],
        };

        // --- Insert analysis result into database ---
        const {data: aData, error: aError} = await supabase
            .from("analyses")
            .insert({
                transcript_id: transcriptId,
                summary: aiResult.summary,
                positive_feedback: aiResult.positive_feedback,
                negative_feedback: aiResult.negative_feedback,
            })
            .select("id")
            .single();


        if (aError) {
            throw new Error(`Supabase insert failed: ${aError.message}`);
        }

        return NextResponse.json({
            ok: true,
            result: {
                transcriptId,
                analysisId: aData.id,
                summary: aiResult.summary,
                positive_feedback: aiResult.positive_feedback,
                negative_feedback: aiResult.negative_feedback,
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ API Error:', msg);
        return NextResponse.json({ok: false, error: msg}, {status: 500});
    }
}
