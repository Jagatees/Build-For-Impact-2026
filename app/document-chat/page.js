"use client";

import { useState, useCallback } from "react";
import { FileText, Plus, Mic, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

const seaLionLanguages = [
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "ms", label: "Malay" },
  { code: "zh", label: "Mandarin (Chinese)" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "th", label: "Thai" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
];

export default function Page() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [hasTranslated, setHasTranslated] = useState(false);
  const router = useRouter();

  const handleTranslate = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setError("");

    try {
      // Extract text from PDF on client side using browser PDF.js
      const arrayBuffer = await file.arrayBuffer();
      
      // Dynamically import pdfjs-dist for client-side only
      let pdfjsLib;
      
      // Ensure we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error("PDF processing must run in browser");
      }
      
      try {
        // Import pdfjs-dist - handle different export formats
        const pdfjsModule = await import('pdfjs-dist');
        
        // Try different ways to access the library
        pdfjsLib = pdfjsModule.default || 
                   pdfjsModule.pdfjsLib || 
                   pdfjsModule;
        
        // Validate we have the library
        if (!pdfjsLib) {
          throw new Error("PDF.js module returned empty");
        }
        
        // Check for getDocument - try different property names
        if (typeof pdfjsLib.getDocument !== 'function') {
          // Try alternative exports
          pdfjsLib = pdfjsModule.getDocument ? pdfjsModule : pdfjsLib;
          if (typeof pdfjsLib.getDocument !== 'function') {
            throw new Error(`PDF.js getDocument not found. Available: ${Object.keys(pdfjsLib).join(', ')}`);
          }
        }
        
        // Configure worker
        if (pdfjsLib.GlobalWorkerOptions) {
          const version = pdfjsLib.version || '5.4.530';
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
        }
      } catch (importError) {
        console.error("PDF.js import error:", importError);
        const errorDetails = importError.message || String(importError);
        throw new Error(`Failed to load PDF.js: ${errorDetails}. Please restart the dev server (npm run dev) and try again.`);
      }
      
      // Final check
      if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
        throw new Error("PDF.js library is missing getDocument function");
      }
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true 
      });
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      let extractedText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str)
          .join(' ');
        extractedText += pageText + '\n\n';
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF. The PDF might be image-based or empty.');
      }

      // Send extracted text to server for translation
      const response = await fetch("/api/document-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Translation failed");
      }

      // ✅ Backend now returns JSON
      const data = await response.json();

      // ✅ Store translation
      sessionStorage.setItem("translatedText", data.translatedText);

      sessionStorage.setItem("originalText", extractedText); // English text

      // ✅ Store metadata
      sessionStorage.setItem("language", selectedLanguage);
      sessionStorage.setItem("filename", file.name);

      // ✅ Store PDF blob URL
      const pdfUrl = URL.createObjectURL(file);
      sessionStorage.setItem("pdfUrl", pdfUrl);

      // ✅ Navigate AFTER everything is saved
      router.push("/document-chat/viewer");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to translate document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError("");
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navigation />
      <div className="flex flex-col items-center px-4 py-12 gap-8">
      {/* UPLOAD CARD */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Upload Your Documents
        </h1>

        <p className="text-gray-600 mb-8">
          Put your papers here so I can help you read them.
        </p>

        {/* DROP ZONE */}
        <div
          className={`relative rounded-xl border-2 border-dashed p-8 transition-all
            ${isDragging ? "border-teal-500 bg-teal-50" : "border-teal-400"}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-20 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-10 h-10 text-teal-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <p className="text-xl font-semibold text-gray-900 mb-1">
            Drag and Drop
          </p>
          <p className="text-gray-600 mb-6">Move your files into this box</p>

          <label className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-full cursor-pointer">
            <FileText className="w-5 h-5" />
            Pick a File
            <input
              type="file"
              accept=".pdf"
              hidden
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <div className="mt-6 inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-lg">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{file.name}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}

        {/* LANGUAGE + TRANSLATE */}
        <div className="mt-6 bg-gray-50 rounded-xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {seaLionLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            className={`px-6 py-3 rounded-full font-medium text-white transition
              ${
                file
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-gray-400 cursor-not-allowed"
              }
            `}
            disabled={!file || isUploading}
            onClick={handleTranslate}
          >
            {isUploading ? "Translating..." : "Translate"}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Your documents are safe and private.</span>
        </div>
      </div>
      </div>
    </div>
  );
}
