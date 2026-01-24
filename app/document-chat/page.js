'use client'

import { useState } from 'react'
import Link from 'next/link'

// REPLACE with your actual Lambda Function URL
const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";

export default function DocumentChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Upload your SIT letter. I will extract the text and you can translate it!', type: 'bot' }
  ])
  const [isUploading, setIsUploading] = useState(false)
  
  // Data States
  const [pdfWords, setPdfWords] = useState([]) // From Textract
  const [translatedWords, setTranslatedWords] = useState([]) // From LLM
  const [currentPage, setCurrentPage] = useState(1) // Toggle between Page 1 and 2 
  const [targetLanguage, setTargetLanguage] = useState('zh')

  // 1. POLLING: Checks if the multi-page analysis is done
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
          setPdfWords(data.words); //
          setMessages(prev => [...prev, { id: Date.now(), text: "✅ Extraction complete. Ready for translation!", type: 'bot' }]);
          setIsUploading(false);
        } else if (data.status === "FAILED") {
          setIsUploading(false);
        } else {
          setTimeout(checkStatus, 2000);
        }
      } catch (err) { console.error(err); setIsUploading(false); }
    };
    checkStatus();
  };

  // 2. UPLOAD: S3 + Textract Job
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Step A: Get Pre-signed URL
      const res = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_PRESIGNED_URL", fileName: file.name })
      });
      const { uploadUrl, s3Key } = await res.json();

      // Step B: Upload to S3
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });

      // Step C: Start Textract
      const startRes = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "START_TEXTRACT", s3Key })
      });
      const { jobId } = await startRes.json();
      pollForResults(jobId);
    } catch (err) { console.error(err); setIsUploading(false); }
  };

  // 3. TRANSLATE: Send Textract blocks to your LLM API
  const handleTranslate = async () => {
    setMessages(prev => [...prev, { id: Date.now(), text: `🔄 Translating to ${targetLanguage}...`, type: 'bot' }]);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          words: pdfWords.map(w => ({ id: w.id, text: w.text })), 
          lang: targetLanguage 
        })
      });
      const { translatedList } = await response.json();
      
      // Merge translated text with original coordinates
      const merged = pdfWords.map(orig => ({
        ...orig,
        text: translatedList.find(t => t.id === orig.id)?.text || orig.text
      }));
      setTranslatedWords(merged);
    } catch (err) { console.error(err); }
  };

  // Filter words for the active side 
  const sourceWords = pdfWords.filter(w => w.page === currentPage);
  const resultWords = (translatedWords.length > 0 ? translatedWords : pdfWords).filter(w => w.page === currentPage);

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans">
      <nav className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-blue-800">SIT PDF Translator</h1>
        <div className="flex gap-4 items-center">
          <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="p-1 border rounded text-sm">
            <option value="zh">Mandarin</option>
            <option value="ms">Malay</option>
            <option value="ta">Tamil</option>
          </select>
          <button onClick={handleTranslate} className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700">Translate</button>
          <input type="file" onChange={handlePdfUpload} className="text-xs" />
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* LEFT: ORIGINAL SOURCE  */}
        <div className="w-1/2 bg-white rounded shadow-md flex flex-col border border-gray-300">
          <div className="p-2 border-b flex justify-between bg-gray-50 items-center">
            <span className="text-xs font-bold uppercase">Source: Page {currentPage}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(1)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 1</button>
              <button onClick={() => setCurrentPage(2)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 2</button>
            </div>
          </div>
          <div className="flex-1 relative bg-gray-200 overflow-auto p-4">
            <div className="relative mx-auto bg-white shadow-lg" style={{ width: '100%', aspectRatio: '1/1.41' }}>
              {sourceWords.map(w => (
                <div key={w.id} style={{ 
                  position: 'absolute', top: `${w.geometry.top * 100}%`, left: `${w.geometry.left * 100}%`,
                  width: `${w.geometry.width * 100}%`, height: `${w.geometry.height * 100}%`,
                  fontSize: '7px', border: '1px solid rgba(255,0,0,0.2)', backgroundColor: 'rgba(255,0,0,0.05)'
                }}>{w.text}</div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: TRANSLATED RESULT  */}
        <div className="w-1/2 bg-white rounded shadow-md flex flex-col border-l-4 border-blue-500">
          <div className="p-2 border-b bg-blue-50 text-xs font-bold text-blue-800">TRANSLATED EDITOR</div>
          <div className="flex-1 relative bg-gray-200 overflow-auto p-4">
            <div className="relative mx-auto bg-white shadow-lg" style={{ width: '100%', aspectRatio: '1/1.41' }}>
              {resultWords.map(w => (
                <textarea
                  key={w.id}
                  defaultValue={w.text}
                  style={{ 
                    position: 'absolute', top: `${w.geometry.top * 100}%`, left: `${w.geometry.left * 100}%`,
                    width: `${w.geometry.width * 100}%`, height: `${w.geometry.height * 100}%`,
                    fontSize: '8px', border: '1px solid blue', background: 'transparent', resize: 'both', zIndex: 10
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}