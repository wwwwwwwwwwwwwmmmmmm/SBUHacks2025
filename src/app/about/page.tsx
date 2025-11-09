export default function AboutPage() {
    return (
      <div className="text-center mt-12">
        <h1 className="text-4xl font-bold text-black dark:text-black mb-6">
          About Us
        </h1>
        <p className="text-lg text-black dark:text-black max-w-2xl mx-auto mb-10">
        At CLP, we understand that in today’s enterprise environment, unstructured conversation data—from sales calls and client meetings to internal strategy sessions—represents a vast, untapped repository of actionable insights. Traditional manual review is slow, costly, and prone to human bias.

Our platform provides a secure, scalable AI solution designed to address this inefficiency, transforming the chaotic volume of transcripts into clear, objective, and quantifiable intelligence.
        </p>
        <a
          href="" // change this to your link
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Upload Here
        </a>
      </div>
    );
  }
  