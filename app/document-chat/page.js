'use client'
import { useState } from 'react'

const LAMBDA_URL = "https://s5rir3bn5qiz62sikj7w364t2i0bhjxr.lambda-url.us-east-1.on.aws/";

export default function DocumentChat() {
  const [messages, setMessages] = useState([]);
  const [pdfWords, setPdfWords] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  

  // Polling logic to wait for Textract to finish page 1 and 2
  const pollForResults = async (jobId) => {
    console.log("Polling for results for JobId:", jobId)
    
    const checkStatus = async () => {
      try {
        const response = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "GET_RESULTS", jobId })
        })

        const data = await response.json()
        console.log("Current Job Status:", data.status)

        if (data.status === "SUCCEEDED") {
          console.log(`Success! Extracted ${data.words.length} words.`)
          setPdfWords(data.words)
          
          // Combine text for your chat context
          const fullText = data.words.map(w => w.text).join(' ')
          setPdfText(fullText)
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: "✅ Analysis complete! I've mapped out the text and tables from your document.",
            type: 'bot'
          }])
        } else if (data.status === "FAILED") {
          console.error("Textract Job Failed.")
        } else {
          // Still processing, check again in 2 seconds
          setTimeout(checkStatus, 2000)
        }
      } catch (err) {
        console.error("Error polling results:", err)
      }
    }

    checkStatus()
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log(`Step 0: Starting process for ${file.name}`)
    setIsUploading(true)
    
    try {
      // 1. Get Pre-signed URL from Lambda
      console.log("Step 1: Requesting Pre-signed URL...")
      const res = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_PRESIGNED_URL", fileName: file.name })
      })

      if (!res.ok) throw new Error("Failed to get upload URL")
      const { uploadUrl, s3Key } = await res.json()
      console.log("Step 1 Success. S3 Key:", s3Key)

      // 2. Upload directly to S3
      console.log("Step 2: Uploading file to S3...")
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file
      })

      if (!s3Res.ok) throw new Error("S3 Upload failed. Check Bucket CORS.")
      console.log("Step 2 Success. File is in S3.")

      // 3. Start Multi-page Textract Job
      console.log("Step 3: Triggering Textract Analysis...")
      const startRes = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "START_TEXTRACT", s3Key: s3Key })
      })

      const { jobId } = await startRes.json()
      console.log("Step 3 Success. JobId:", jobId)

      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `📄 Document uploaded. Now analyzing both pages of your SIT letter...`,
        type: 'bot'
      }])

      // 4. Start Polling for results
      pollForResults(jobId)

    } catch (error) {
      console.error("Critical Upload Error:", error)
      alert(error.message)
    } finally {
      setIsUploading(false)
      e.target.value = '' // Reset input
    }
  }

  

  return (
    <div className="p-10">
      <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isUploading} />
      {/* Map through pdfWords here to render your editable boxes as before */}
    </div>
  );
}