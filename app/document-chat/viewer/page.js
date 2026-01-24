"use client";

import { useEffect, useState } from "react";

export default function ViewerPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedPdfUrl = sessionStorage.getItem("pdfUrl");
    const storedTranslation = sessionStorage.getItem("translatedText");

    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
    }

    if (storedTranslation) {
      setTranslatedText(storedTranslation);
    }
  }, []);

  return (
    <div className="h-screen flex">
      {/* LEFT PANEL — ORIGINAL PDF */}
      <div className="w-1/2 border-r bg-gray-50">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Original PDF"
            className="w-full h-full"
          />
        ) : (
          <div className="p-6 text-gray-500">
            No PDF found. Please upload a document.
          </div>
        )}
      </div>

      {/* RIGHT PANEL — TRANSLATED TEXT */}
      <div className="w-1/2 overflow-auto bg-white p-6">
        <h2 className="text-xl font-bold mb-4">
          Translated Document
        </h2>

        {translatedText ? (
          <pre className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {translatedText}
          </pre>
        ) : (
          <p className="text-gray-500">
            No translation available.
          </p>
        )}
      </div>
    </div>
  );
}
