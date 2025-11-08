"use client";

import {useState} from "react";

export default function TestPage() {
    const [result, setResult] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const callNeuralSeek = async () => {
        setLoading(true);
        setResult("");

        const apiKey = process.env.NEXT_PUBLIC_NEURALSEEK_API_KEY;
        if (!apiKey) {
            setResult("Missing NEXT_PUBLIC_NEURALSEEK_API_KEY in environment");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("https://stagingapi.neuralseek.com/v1/stony18/seek", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: "Create summary of this text and create a list of positive and negative words associated with it. Text: Customer%20Service%20Representative%20%28CSR%29%3A%20Thank%20you%20for%20calling%20StellarTech%20Support.%20My%20name%20is%20Lisa.%20How%20can%20I%20assist%20you%20today%3F%0A%0ACustomer%20%28C%29%3A%20Hi%2C%20Lisa.%20I%20recently%20purchased%20a%20laptop%20from%20your%20website%2C%20and%20it%20keeps%20shutting%20down%20unexpectedly.%0A%0ACSR%3A%20I%E2%80%99m%20sorry%20to%20hear%20that%21%20I%E2%80%99d%20be%20happy%20to%20help.%20Can%20I%20start%20by%20getting%20your%20order%20number%2C%20please%3F%0A%0AC%3A%20Sure%2C%20it%E2%80%99s%20123456789.%0A%0ACSR%3A%20Thank%20you.%20I%20see%20your%20order%20here.%20Just%20to%20confirm%2C%20this%20is%20the%20StellarBook%20Pro%2015-inch%20model%2C%20correct%3F%0A%0AC%3A%20Yes%2C%20that%E2%80%99s%20the%20one.%0A%0ACSR%3A%20Great.%20When%20did%20the%20shutdowns%20start%20happening%3F%0A%0AC%3A%20It%20started%20a%20couple%20of%20days%20after%20I%20got%20it.%0A%0ACSR%3A%20Understood.%20Let%E2%80%99s%20run%20through%20some%20troubleshooting%20steps.%20First%2C%20have%20you%20noticed%20if%20the%20laptop%20shuts%20down%20when%20performing%20a%20specific%20task%2C%20like%20gaming%20or%20streaming%3F%0A%0AC%3A%20It%20seems%20random%2C%20sometimes%20while%20browsing%20the%20web%20or%20even%20just%20watching%20a%20video.%0A%0ACSR%3A%20Okay.%20Let%E2%80%99s%20try%20a%20couple%20of%20things.%20Could%20you%20please%20make%20sure%20your%20laptop%20is%20fully%20updated%3F%20Go%20to%20Settings%20%E2%86%92%20Update%20%26%20Security%20%E2%86%92%20Windows%20Update%20and%20click%20%E2%80%9CCheck%20for%20updates.%E2%80%9D%0A%0AC%3A%20Okay%2C%20I%E2%80%99m%20doing%20that%20now%E2%80%A6%20It%20says%20there%20are%20two%20updates%20pending.%0A%0ACSR%3A%20Perfect.%20Please%20install%20those%20and%20restart%20your%20laptop%20once%20done.%20That%20may%20solve%20the%20issue%20if%20it%E2%80%99s%20software-related.%0A%0AC%3A%20Alright%2C%20it%E2%80%99s%20restarting.%0A%0ACSR%3A%20Once%20it%E2%80%99s%20back%20on%2C%20monitor%20it%20for%20the%20next%20few%20hours.%20If%20it%20still%20shuts%20down%20unexpectedly%2C%20we%20might%20need%20to%20look%20at%20a%20hardware%20issue%20and%20arrange%20a%20replacement.%0A%0AC%3A%20Got%20it.%20Thank%20you%20so%20much%20for%20your%20help%21%0A%0ACSR%3A%20You%E2%80%99re%20welcome%21%20I%E2%80%99ve%20made%20a%20note%20of%20this%20call%2C%20so%20if%20you%20need%20to%20follow%20up%2C%20we%E2%80%99ll%20have%20all%20the%20details%20ready.%20Is%20there%20anything%20else%20I%20can%20assist%20you%20with%20today%3F%0A%0AC%3A%20No%2C%20that%E2%80%99s%20everything.%0A%0ACSR%3A%20Thank%20you%20for%20calling%20StellarTech%20Support.%20Have%20a%20great%20day%2C%20and%20I%20hope%20your%20laptop%20runs%20smoothly%20after%20the%20update%21%0A%0AC%3A%20Thanks%2C%20bye.%0A%0ACSR%3A%20Goodbye%21",
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API returned ${response.status}: ${text}`);
            }

            const data = await response.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unexpected error";
            setResult(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">NeuralSeek API Test</h1>

            <button
                onClick={callNeuralSeek}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                {loading ? "Loading..." : "Call NeuralSeek"}
            </button>

            {result && (
                <pre className="mt-4 p-3 bg-gray-900 text-green-300 rounded overflow-x-auto text-sm">
          {result}
        </pre>
            )}
        </div>
    );
}
