"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import Navigation from "@/components/Navigation";

const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";
const SEA_LION_API_URL = 'https://cf-sealion01.jagateesvaran.workers.dev';

export default function ReviewPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // PDF Translator & Auditor States
  const [messages, setMessages] = useState([
    { id: 1, text: 'Upload your SIT letter. Changing the language will auto-translate the entire document!', type: 'bot' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfWords, setPdfWords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('en');

  useEffect(() => {
    const url = sessionStorage.getItem("pdfUrl");
    const text = sessionStorage.getItem("originalText"); // Extracted PDF text
    const language = sessionStorage.getItem("language") || "en";
    const storedWords = sessionStorage.getItem("pdfWords");

    console.log("🌐 Review page language:", language);

    if (!url || !text) {
      router.push("/document-chat");
      return;
    }

    setPdfUrl(url);
    runReview(text, language);
    
    // Get pdfWords from sessionStorage if available
    if (storedWords) {
      try {
        const words = JSON.parse(storedWords);
        setPdfWords(words);
      } catch (err) {
        console.error("Error parsing pdfWords from sessionStorage:", err);
      }
    }
  }, [router]);

  // AUTO-TRANSLATE TRIGGER - Runs whenever the dropdown changes or new text is extracted
  useEffect(() => {
    if (pdfWords.length > 0 && targetLanguage !== 'en') {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage, pdfWords.length]);

  // TRANSLATION LOGIC: Sends data to SEA-LION LLM
  const handleTranslate = async () => {
    setMessages(prev => [...prev, { id: Date.now(), text: `🔄 Translating into ${targetLanguage}...`, type: 'bot' }]);
    
    try {
      const response = await fetch(SEA_LION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: "translate",
          targetLanguage: targetLanguage,
          blocks: pdfWords.map(w => ({ id: w.id, text: w.text })) 
        })
      });

      const rawText = await response.text();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid LLM Response");
      
      const data = JSON.parse(jsonMatch[0]);
      
      if (data.translatedBlocks) {
        const merged = pdfWords.map(orig => ({
          ...orig,
          text: data.translatedBlocks.find(t => t.id === orig.id)?.text || orig.text
        }));
        setPdfWords(merged);
        sessionStorage.setItem("pdfWords", JSON.stringify(merged));
        setMessages(prev => [...prev, { id: Date.now(), text: "✅ Translation Applied!", type: 'bot' }]);
      }
    } catch (err) {
      console.error("Translation Error:", err);
      setMessages(prev => [...prev, { id: Date.now(), text: `❌ Translation failed: ${err.message}`, type: 'bot' }]);
    }
  };

  // DOWNLOAD: Reconstructs the PDF with current text
  const downloadAsPdf = () => {
    if (pdfWords.length === 0) return;
    
    const doc = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const pages = [...new Set(pdfWords.map(w => w.page))].sort((a, b) => a - b);

    pages.forEach((pageNum, index) => {
      if (index > 0) doc.addPage();
      const words = pdfWords.filter(w => w.page === pageNum);
      words.forEach(word => {
        const x = word.geometry.left * pdfWidth;
        const y = word.geometry.top * pdfHeight;
        doc.setFontSize(8);
        doc.text(word.text, x, y);
      });
    });
    doc.save(`SIT_Translated_${targetLanguage}.pdf`);
  };

  // POLLING for Textract results
  const pollForResults = async (jobId) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "GET_RESULTS", jobId })
        });
        const data = await response.json();
        if (data.status === "SUCCEEDED") {
          setPdfWords(data.words);
          sessionStorage.setItem("pdfWords", JSON.stringify(data.words));
          setIsUploading(false);
          setMessages(prev => [...prev, { id: Date.now(), text: "✅ PDF processed successfully!", type: 'bot' }]);
        } else if (data.status === "FAILED") { 
          setIsUploading(false);
          setMessages(prev => [...prev, { id: Date.now(), text: "❌ PDF processing failed.", type: 'bot' }]);
        } else { 
          setTimeout(checkStatus, 2000); 
        }
      } catch (err) {
        console.error("Polling error:", err);
        setIsUploading(false);
        setMessages(prev => [...prev, { id: Date.now(), text: "❌ Error checking PDF status.", type: 'bot' }]);
      }
    };
    checkStatus();
  };

  // UPLOAD & PROCESS PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setMessages(prev => [...prev, { id: Date.now(), text: "📤 Uploading PDF...", type: 'bot' }]);
    
    try {
      const res = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_PRESIGNED_URL", fileName: file.name })
      });
      
      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { uploadUrl, s3Key } = await res.json();
      
      await fetch(uploadUrl, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/pdf' }, 
        body: file 
      });
      
      const startRes = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "START_TEXTRACT", s3Key })
      });
      
      if (!startRes.ok) throw new Error("Failed to start Textract job");
      
      const { jobId } = await startRes.json();
      setMessages(prev => [...prev, { id: Date.now(), text: "⏳ Processing PDF...", type: 'bot' }]);
      pollForResults(jobId);
    } catch (err) {
      console.error("Upload error:", err);
      setIsUploading(false);
      setMessages(prev => [...prev, { id: Date.now(), text: `❌ Upload failed: ${err.message}`, type: 'bot' }]);
    }
  };

  const wordsOnCurrentPage = pdfWords.filter(w => w.page === currentPage);
  const totalPages = pdfWords.length > 0 ? Math.max(...pdfWords.map(w => w.page)) : 1;

  // Extract all text from PDF in order
  const getAllPdfText = () => {
    if (pdfWords.length === 0) return '';
    
    const sortedWords = [...pdfWords].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.geometry.top - b.geometry.top) > 0.01) {
        return a.geometry.top - b.geometry.top;
      }
      return a.geometry.left - b.geometry.left;
    });
    
    return sortedWords.map(w => w.text).join(' ');
  };

  const fullPdfText = getAllPdfText();

  const runReview = async (text, language) => {
    setLoading(true);

    try {
      console.log("📤 Sending review request:", {
        textLength: text.length,
        language,
      });

      const response = await fetch("/api/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language, // ✅ REQUIRED
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("❌ Review API error:", err);
        throw new Error("Review failed");
      }

      const data = await response.json();
      console.log("📥 Review API response:", data);

      setIssues(data.issues || []);
    } catch (err) {
      console.error("🔥 Review error:", err);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navigation />
      
      {/* TOP: SIDE-BY-SIDE REVIEW SECTION */}
      <div className="flex flex-1" style={{ minHeight: '600px' }}>
      {/* LEFT: ORIGINAL PDF */}
      <div className="w-1/2 flex flex-col bg-white border-r">
        <div className="px-6 py-4 border-b text-sm font-semibold">
          Original Document (Review)
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-full" title="Original PDF" />
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
              className="bg-white border-l-4 border-red-600 rounded-md p-4 shadow-sm"
            >
              {/* HEADER */}
              <div className="mb-2 text-sm font-semibold text-red-600">
                Issue {issue.issueNumber}
              </div>

              {/* FLAGGED STATEMENT (ENGLISH) */}
              <p className="text-sm font-semibold">
                Flagged Statement (English):
              </p>
              <p className="italic mb-3">“{issue.flaggedStatement || "—"}”</p>

              {/* FLAGGED STATEMENT (TRANSLATED) */}
              <p className="text-sm font-semibold">
                Flagged Statement (Translated):
              </p>
              <p className="italic mb-3">
                “{issue.flaggedStatementTranslated || "—"}”
              </p>

              {/* CONCERN (ENGLISH) */}
              <p className="text-sm font-semibold">
                Why this is a concern (English):
              </p>
              <p className="mb-3 whitespace-pre-wrap">
                {issue.concernEnglish || "—"}
              </p>

              {/* CONCERN (TRANSLATED) */}
              <p className="text-sm font-semibold">
                Why this is a concern (Translated):
              </p>
              <p className="mb-3 whitespace-pre-wrap">
                {issue.concernTranslated || "—"}
              </p>

              {/* ACTION */}
              <p className="text-sm font-semibold">Who to reach out to:</p>
              <p className="whitespace-pre-wrap">{issue.action || "—"}</p>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* BOTTOM: PDF AUDITOR & TRANSLATOR SECTION */}
      <div className="border-t-2 border-gray-300 bg-gray-50">
        <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
          <h1 className="font-bold text-blue-800">SIT PDF Auditor & Translator</h1>
          <div className="flex gap-4 items-center">
            <select 
              value={targetLanguage} 
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="p-1 border rounded text-sm bg-gray-50"
            >
              <option value="en">English (Original)</option>
              <option value="zh">Mandarin</option>
              <option value="ms">Malay</option>
              <option value="ta">Tamil</option>
            </select>
            <button 
              onClick={downloadAsPdf} 
              disabled={pdfWords.length === 0 || isUploading} 
              className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 disabled:bg-gray-400"
            >
              Download PDF
            </button>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handlePdfUpload} 
              className="text-xs"
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden p-4 gap-4" style={{ minHeight: '500px' }}>
          {/* LEFT: VISUAL MAP */}
          <div className="w-2/3 bg-white rounded shadow-md flex flex-col border border-gray-300">
            <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-gray-500">
                Visual Map: Page {currentPage} of {totalPages || 1}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pageNum) => (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)} 
                    className={`px-2 py-0.5 text-xs rounded ${
                      currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Pg {pageNum}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 relative bg-gray-200 overflow-auto p-8">
              {pdfWords.length > 0 ? (
                <div className="relative mx-auto bg-white shadow-2xl" style={{ width: '100%', aspectRatio: '1/1.41' }}>
                  {wordsOnCurrentPage.map(w => (
                    <div 
                      key={w.id} 
                      className="flex items-center justify-center overflow-hidden"
                      style={{ 
                        position: 'absolute', 
                        top: `${w.geometry.top * 100}%`, 
                        left: `${w.geometry.left * 100}%`,
                        width: `${w.geometry.width * 100}%`, 
                        height: `${w.geometry.height * 100}%`,
                        border: hoveredId === w.id ? '2px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.4)',
                        backgroundColor: hoveredId === w.id ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        transition: 'all 0.1s ease', 
                        zIndex: hoveredId === w.id ? 20 : 10
                      }} 
                    >
                      <span 
                        style={{ 
                          fontSize: 'max(5px, 0.5vw)', 
                          color: hoveredId === w.id ? '#ef4444' : '#1e40af', 
                          pointerEvents: 'none' 
                        }}
                      >
                        {w.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {isUploading ? "Processing PDF..." : "Upload a PDF to see the visual map"}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: DATA INVENTORY */}
          <div className="w-1/3 bg-white rounded shadow-md flex flex-col border-l-4 border-blue-500 overflow-hidden">
            <div className="p-3 border-b bg-blue-50 text-xs font-bold text-blue-800">
              DATA INVENTORY ({wordsOnCurrentPage.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
              {wordsOnCurrentPage.length > 0 ? (
                wordsOnCurrentPage.map((word) => (
                  <div 
                    key={word.id} 
                    onMouseEnter={() => setHoveredId(word.id)} 
                    onMouseLeave={() => setHoveredId(null)}
                    className={`p-2 rounded border transition-all ${
                      hoveredId === word.id 
                        ? 'border-blue-500 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input 
                      className="w-full text-xs font-semibold bg-transparent border-none focus:ring-0 p-0"
                      value={word.text}
                      onChange={(e) => {
                        const updated = pdfWords.map(pw => 
                          pw.id === word.id ? {...pw, text: e.target.value} : pw
                        );
                        setPdfWords(updated);
                        sessionStorage.setItem("pdfWords", JSON.stringify(updated));
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {isUploading ? "Processing..." : "No words on this page"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FULL DOCUMENT TEXT */}
        <div className="bg-white border-t border-gray-300 flex flex-col" style={{ height: '300px' }}>
          <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-gray-600">Full Document Text</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullPdfText);
                setMessages(prev => [...prev, { id: Date.now(), text: '✅ Text copied to clipboard!', type: 'bot' }]);
              }}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={!fullPdfText}
            >
              📋 Copy All Text
            </button>
          </div>
          <textarea
            className="flex-1 w-full p-4 text-sm font-mono bg-white text-gray-800 resize-none border-none focus:outline-none overflow-auto"
            value={fullPdfText || 'Upload a PDF to see the extracted text here...'}
            readOnly
            placeholder="Full document text will appear here..."
          />
        </div>
      </div>

      {/* MESSAGES */}
      {messages.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border p-2 max-h-32 overflow-y-auto z-50">
          {messages.slice(-3).map(msg => (
            <div key={msg.id} className="text-xs text-gray-600 mb-1">
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
