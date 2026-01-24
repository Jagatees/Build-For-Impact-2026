// 'use client'

// import { useState, useEffect } from 'react'
// import Link from 'next/link'

// const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";

// export default function DocumentChat() {
//   const [messages, setMessages] = useState([
//     { id: 1, text: 'Upload your SIT letter to see the full data inventory!', type: 'bot' }
//   ])
//   const [isUploading, setIsUploading] = useState(false)
//   const [pdfWords, setPdfWords] = useState([]) 
//   const [currentPage, setCurrentPage] = useState(1) 
//   const [hoveredId, setHoveredId] = useState(null) // Tracks which item is being hovered

//   // 1. POLLING: Checks AWS for Textract completion
//   const pollForResults = async (jobId) => {
//     const checkStatus = async () => {
//       try {
//         const response = await fetch(LAMBDA_URL, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ action: "GET_RESULTS", jobId })
//         });
//         const data = await response.json();
        
//         if (data.status === "SUCCEEDED") {
//           setPdfWords(data.words); //
//           setMessages(prev => [...prev, { id: Date.now(), text: "✅ Data inventory loaded!", type: 'bot' }]);
//           setIsUploading(false);
//         } else if (data.status === "FAILED") {
//           setIsUploading(false);
//         } else {
//           setTimeout(checkStatus, 2000);
//         }
//       } catch (err) { console.error(err); setIsUploading(false); }
//     };
//     checkStatus();
//   };

//   // 2. UPLOAD: 3-step S3 + Textract process
//   const handlePdfUpload = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setIsUploading(true);
//     try {
//       const res = await fetch(LAMBDA_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: "GET_PRESIGNED_URL", fileName: file.name })
//       });
//       const { uploadUrl, s3Key } = await res.json();
//       await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });

//       const startRes = await fetch(LAMBDA_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: "START_TEXTRACT", s3Key })
//       });
//       const { jobId } = await startRes.json();
//       pollForResults(jobId);
//     } catch (err) { console.error(err); setIsUploading(false); }
//   };

//   // Filter words by the active page
//   const wordsOnCurrentPage = pdfWords.filter(w => w.page === currentPage);

//   return (
//     <div className="h-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
//       <nav className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
//         <h1 className="font-bold text-blue-800">SIT Data Auditor</h1>
//         <div className="flex gap-4 items-center">
//           <input type="file" onChange={handlePdfUpload} className="text-xs" />
//         </div>
//       </nav>

//       <div className="flex flex-1 overflow-hidden p-4 gap-4">
        
//         {/* LEFT: VISUAL EDITOR */}
//         <div className="w-2/3 bg-white rounded shadow-md flex flex-col border border-gray-300">
//           <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
//             <span className="text-xs font-bold uppercase">Map View: Page {currentPage}</span>
//             <div className="flex gap-1">
//               <button onClick={() => setCurrentPage(1)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 1</button>
//               <button onClick={() => setCurrentPage(2)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 2</button>
//             </div>
//           </div>
//           <div className="flex-1 relative bg-gray-200 overflow-auto p-8">
//             <div className="relative mx-auto bg-white shadow-2xl" style={{ width: '100%', aspectRatio: '1/1.41' }}>
//               {wordsOnCurrentPage.map(w => (
//                 <div 
//                   key={w.id} 
//                   style={{ 
//                     position: 'absolute', 
//                     top: `${w.geometry.top * 100}%`, 
//                     left: `${w.geometry.left * 100}%`,
//                     width: `${w.geometry.width * 100}%`, 
//                     height: `${w.geometry.height * 100}%`,
//                     border: hoveredId === w.id ? '2px solid red' : '1px solid rgba(0,0,255,0.2)',
//                     backgroundColor: hoveredId === w.id ? 'rgba(255,0,0,0.1)' : 'transparent',
//                     transition: 'all 0.1s ease',
//                     zIndex: hoveredId === w.id ? 20 : 10
//                   }} 
//                 />
//               ))}
//               {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold">ANALYZING...</div>}
//             </div>
//           </div>
//         </div>

//         {/* RIGHT: DATA INVENTORY LIST */}
//         <div className="w-1/3 bg-white rounded shadow-md flex flex-col border-l-4 border-blue-500 overflow-hidden">
//           <div className="p-3 border-b bg-blue-50 text-xs font-bold text-blue-800 flex justify-between">
//             <span>DATA POINTS ({wordsOnCurrentPage.length})</span>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
//             {wordsOnCurrentPage.map((word) => (
//               <div 
//                 key={word.id} 
//                 onMouseEnter={() => setHoveredId(word.id)}
//                 onMouseLeave={() => setHoveredId(null)}
//                 className={`p-2 rounded border transition-all ${hoveredId === word.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white'}`}
//               >
//                 <div className="flex justify-between text-[9px] mb-1 font-mono text-gray-400">
//                   <span>LOC: {Math.round(word.geometry.left * 100)}%, {Math.round(word.geometry.top * 100)}%</span>
//                   <span>ID: {word.id.slice(0, 5)}</span>
//                 </div>
//                 <input 
//                   className="w-full text-xs font-semibold bg-transparent border-none focus:ring-0 p-0"
//                   value={word.text}
//                   onChange={(e) => {
//                     const updated = pdfWords.map(pw => pw.id === word.id ? {...pw, text: e.target.value} : pw);
//                     setPdfWords(updated);
//                   }}
//                 />
//               </div>
//             ))}
//             {wordsOnCurrentPage.length === 0 && !isUploading && (
//               <div className="text-center py-20 text-gray-400 text-sm italic">No data extracted yet.</div>
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   )
// }

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";

export default function DocumentChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Upload your SIT letter to see the full data inventory!', type: 'bot' }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [pdfWords, setPdfWords] = useState([]) 
  const [currentPage, setCurrentPage] = useState(1) 
  const [hoveredId, setHoveredId] = useState(null)

  // 1. POLLING: Checks AWS for Textract completion
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
          setMessages(prev => [...prev, { id: Date.now(), text: "✅ Data inventory loaded!", type: 'bot' }]);
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

  // 2. UPLOAD: 3-step S3 + Textract process
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

  // Filter words by the active page
  const wordsOnCurrentPage = pdfWords.filter(w => w.page === currentPage);

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      <nav className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <h1 className="font-bold text-blue-800">SIT Data Auditor</h1>
        <div className="flex gap-4 items-center">
          <input type="file" onChange={handlePdfUpload} className="text-xs" />
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        
        {/* LEFT: VISUAL MAP WITH TEXT OVERLAY */}
        <div className="w-2/3 bg-white rounded shadow-md flex flex-col border border-gray-300">
          <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase">Map View: Page {currentPage}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(1)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 1</button>
              <button onClick={() => setCurrentPage(2)} className={`px-2 py-0.5 text-xs rounded ${currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pg 2</button>
            </div>
          </div>
          <div className="flex-1 relative bg-gray-200 overflow-auto p-8">
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
                  <span style={{ 
                    fontSize: 'max(5px, 0.5vw)', 
                    color: hoveredId === w.id ? '#ef4444' : '#1e40af',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    fontWeight: hoveredId === w.id ? 'bold' : 'normal'
                  }}>
                    {w.text}
                  </span>
                </div>
              ))}
              {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold">ANALYZING...</div>}
            </div>
          </div>
        </div>

        {/* RIGHT: DATA INVENTORY LIST */}
        <div className="w-1/3 bg-white rounded shadow-md flex flex-col border-l-4 border-blue-500 overflow-hidden">
          <div className="p-3 border-b bg-blue-50 text-xs font-bold text-blue-800 flex justify-between">
            <span>DATA POINTS ({wordsOnCurrentPage.length})</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
            {wordsOnCurrentPage.map((word) => (
              <div 
                key={word.id} 
                onMouseEnter={() => setHoveredId(word.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`p-2 rounded border transition-all ${hoveredId === word.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex justify-between text-[9px] mb-1 font-mono text-gray-400">
                  <span>LOC: {Math.round(word.geometry.left * 100)}%, {Math.round(word.geometry.top * 100)}%</span>
                  <span>ID: {word.id.slice(0, 5)}</span>
                </div>
                <input 
                  className="w-full text-xs font-semibold bg-transparent border-none focus:ring-0 p-0"
                  value={word.text}
                  onChange={(e) => {
                    const updated = pdfWords.map(pw => pw.id === word.id ? {...pw, text: e.target.value} : pw);
                    setPdfWords(updated);
                  }}
                />
              </div>
            ))}
            {wordsOnCurrentPage.length === 0 && !isUploading && (
              <div className="text-center py-20 text-gray-400 text-sm italic">No data extracted yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}