"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const url = sessionStorage.getItem("pdfUrl");
    const text = sessionStorage.getItem("originalText"); // English OCR text

    if (!url || !text) {
      router.push("/document-chat");
      return;
    }

    setPdfUrl(url);
    runReview(text);
  }, [router]);

  const runReview = async (text) => {
    setLoading(true);

    try {
      const response = await fetch("/api/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Review failed");
      }

      // ✅ BACKEND NOW RETURNS JSON
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (err) {
      console.error(err);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* LEFT: ORIGINAL PDF */}
      <div className="w-1/2 flex flex-col bg-white border-r">
        <div className="px-6 py-4 border-b text-sm font-semibold">
          Original Document (Review)
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title="Original PDF"
          />
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

          {!loading && issues.length === 0 && (
            <p className="text-gray-500">No issues found.</p>
          )}

          {issues.map((issue) => (
            <div
              key={issue.issueNumber}
              className="bg-white border-l-4 border-red-600
                         rounded-md p-4 shadow-sm"
            >
              {/* HEADER */}
              <div className="mb-2 text-sm font-semibold text-red-600">
                Issue {issue.issueNumber}
              </div>

              {/* PROBLEM */}
              {issue.problem && (
                <>
                  <p className="text-sm font-semibold">Problem:</p>
                  <p className="italic mb-3">
                    “{issue.problem}”
                  </p>
                </>
              )}

              {/* CONCERN */}
              <p className="text-sm font-semibold">
                Why this is a concern:
              </p>
              <p className="mb-3 whitespace-pre-wrap">
                {issue.concern}
              </p>

              {/* ACTION */}
              <p className="text-sm font-semibold">
                Who to reach out to:
              </p>
              <p className="whitespace-pre-wrap">
                {issue.action}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
