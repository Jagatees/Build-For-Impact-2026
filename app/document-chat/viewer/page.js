"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ViewerPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [translatedText, setTranslatedText] = useState("");
  const router = useRouter();

  useEffect(() => {
    const url = sessionStorage.getItem("pdfUrl");
    const text = sessionStorage.getItem("translatedText");
    

    if (url) setPdfUrl(url);
    if (text) setTranslatedText(text);
  }, []);

  // ✅ NEW FUNCTION
  const handleFlawReview = () => {
    if (!pdfUrl) {
      alert("No document found to review.");
      return;
    }

    // (Optional) Ensure translated text exists for later analysis
    if (!translatedText) {
      console.warn("No translated text found yet.");
    }

    // ✅ Navigate to review page
    router.push("/document-chat/viewer/review");
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* LEFT: ORIGINAL PDF */}
      <div className="w-1/2 flex flex-col bg-white border-r">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">
            Original Document
          </h2>
        </div>

        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Original PDF"
              className="w-full h-full"
            />
          ) : (
            <p className="p-6 text-gray-500">
              No document available.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: TRANSLATION */}
      <div className="w-1/2 flex flex-col bg-gray-50">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">
            Translated Version
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {translatedText ? (
            <div className="whitespace-pre-wrap leading-relaxed text-gray-900 text-sm">
              {translatedText}
            </div>
          ) : (
            <p className="text-gray-500">
              Translation not available.
            </p>
          )}
        </div>

        {/* ACTION FOOTER */}
        <div className="px-6 py-4 border-t bg-white">
          <button
            className="w-full py-3 rounded-md
                       bg-red-600 hover:bg-red-700
                       text-white font-medium
                       transition"
            onClick={handleFlawReview}
          >
            Point out the flaws
          </button>
        </div>
      </div>
    </div>
  );
}
