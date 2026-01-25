"use client";

import { useEffect, useState } from "react";

export default function PdfPane() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const url = sessionStorage.getItem("pdfUrl");
    setPdfUrl(url);
  }, []);

  if (!isClient) {
    return <p className="p-4 text-gray-500">Loading PDF viewer…</p>;
  }

  if (!pdfUrl) {
    return <p className="p-4 text-gray-500">No PDF loaded.</p>;
  }

  // Use iframe instead of react-pdf to avoid errors
  return (
    <iframe
      src={pdfUrl}
      className="w-full h-full"
      style={{ minHeight: '600px' }}
      title="PDF Viewer"
    />
  );
}
