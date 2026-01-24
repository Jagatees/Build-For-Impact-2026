"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const url = sessionStorage.getItem("pdfUrl");
    const text = sessionStorage.getItem("originalText"); // English only

    if (!url || !text) {
      router.push("/document-chat");
      return;
    }

    setPdfUrl(url);
    runReview(text);
  }, [router]);

  const runReview = async (text) => {
    setLoading(true);
    setReviewText("");

    try {
      const response = await fetch("/api/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Review failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setReviewText((prev) => prev + chunk);
      }
    } catch (err) {
      console.error(err);
      setReviewText("");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Split issues by numbering (1., 2., 3., …)
  const findings = reviewText
    .split(/(?=ISSUE\s+\d+)/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith("ISSUE"));

  useEffect(() => {
    findings.forEach((issue, index) => {
      console.log("========================================");
      console.log(`Issue ${index}`);
      console.log(issue);
      console.log("========================================");
    });
  }, [findings]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* LEFT: ORIGINAL PDF */}
      <div className="w-1/2 flex flex-col bg-white border-r">
        <div className="px-6 py-4 border-b text-sm font-semibold">
          Original Document (Review)
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-full" />
        </div>
      </div>

      {/* RIGHT: REVIEW FINDINGS */}
      <div className="w-1/2 flex flex-col bg-gray-50">
        <div className="px-6 py-4 border-b text-sm font-semibold">
          Points That May Need Clarification
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <p className="text-gray-500">
              Reviewing document… this may take a moment.
            </p>
          )}

          {!loading && findings.length === 0 && (
            <p className="text-gray-500">No issues found.</p>
          )}

          {findings.map((item, index) => (
            <div
              key={index}
              className="bg-white border-l-4 border-red-600
                         rounded-md p-4 shadow-sm"
            >
              {/* ISSUE HEADER */}
              <div className="mb-2 text-sm font-semibold text-red-600">
                Issue {index + 1}
              </div>

              {/* ISSUE BODY */}
              <div className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
