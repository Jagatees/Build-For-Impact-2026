"use client";

import { useState, useCallback } from "react";
import { FileText, Plus, Mic, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", selectedLanguage);

      const response = await fetch("/api/document-chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      // ✅ Backend now returns JSON
      const data = await response.json();

      // ✅ Store translation
      sessionStorage.setItem("translatedText", data.translatedText);

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
      setError("Failed to translate document.");
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-12 gap-8">
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
            className="border border-gray-300 rounded-lg px-3 py-2"
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

      {/* ⭐ TRANSLATED OUTPUT */}
      {/* {hasTranslated && (
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Translated Document</h2>

          {isUploading && (
            <p className="text-gray-500 mb-4">
              Translating… this may take a moment.
            </p>
          )}

          <pre className="whitespace-pre-wrap text-gray-900 leading-relaxed max-h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-4">
            {translatedText || "Waiting for translation…"}
          </pre>
        </div>
      )} */}
    </div>
  );
}
