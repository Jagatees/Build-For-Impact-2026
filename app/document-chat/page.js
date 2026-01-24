'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";
const SEA_LION_API_URL = 'https://cf-sealion01.jagateesvaran.workers.dev';

export default function DocumentChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Ready! Select a language and I will auto-translate your SIT letter.', type: 'bot' }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [pdfWords, setPdfWords] = useState([]) 
  const [translatedWords, setTranslatedWords] = useState([]) 
  const [currentPage, setCurrentPage] = useState(1) 
  const [targetLanguage, setTargetLanguage] = useState('zh')

  // Auto-translate trigger
  useEffect(() => {
    if (pdfWords.length > 0) {
      handleTranslate();
    }
  }, [targetLanguage, pdfWords]);

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

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_PRESIGNED_URL", fileName: file.name })
      });
      const { uploadUrl, s3Key } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      const startRes = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "START_TEXTRACT", s3Key })
      });
      const { jobId } = await startRes.json();
      pollForResults(jobId);
    } catch (err) { console.error(err); setIsUploading(false); }
  };

  // TRANSLATE: Now with JSON cleaning to fix your error
  const handleTranslate = async () => {
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
      
      // FIX: Extract only the JSON part from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid Response Format");
      
      const data = JSON.parse(jsonMatch[0]);
      
      if (data.translatedBlocks) {
        // Round-trip mapping: Combine translation with original coordinates
        const merged = pdfWords.map(orig => ({
          ...orig,
          text: data.translatedBlocks.find(t => t.id === orig.id)?.text || orig.text
        }));
        setTranslatedWords(merged);
      }
    } catch (err) {
      console.error("Translation Mapping Error:", err);
    }
  };

  const currentWords = (translatedWords.length > 0 ? translatedWords : pdfWords).filter(w => w.page === currentPage);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-blue-700">SIT PDF Translator</h1>
        <div className="flex gap-4">
          <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="p-1 border rounded text-sm">
            <option value="zh">Mandarin</option>
            <option value="ms">Malay</option>
            <option value="ta">Tamil</option>
          </select>
          <input type="file" onChange={handlePdfUpload} className="text-xs" />
        </div>
      </nav>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <div className="w-1/2 bg-white rounded shadow-inner flex flex-col">
          <div className="p-2 border-b bg-gray-100 flex justify-between">
            <span className="text-xs font-bold uppercase">Editor: Page {currentPage}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(1)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 1</button>
              <button onClick={() => setCurrentPage(2)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 2</button>
            </div>
          </div>
          <div className="flex-1 relative bg-gray-300 overflow-auto p-8">
            <div className="relative mx-auto bg-white shadow-2xl" style={{ width: '100%', aspectRatio: '1/1.41' }}>
              {currentWords.map(w => (
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
              {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold">ANALYZING...</div>}
            </div>
          </div>
        </div>
        <div className="w-1/2 bg-white p-4 rounded shadow overflow-y-auto border-l-4 border-blue-500">
           {messages.map(m => <div key={m.id} className={`p-2 my-2 rounded ${m.type === 'bot' ? 'bg-gray-100' : 'bg-blue-100'}`}>{m.text}</div>)}
        </div>
      </div>
    </div>
  )
}