"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-pdf components with SSR disabled
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

export default function PdfPane() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const url = sessionStorage.getItem("pdfUrl");
    setPdfUrl(url);
    
    // Dynamically import CSS only on client side
    import("react-pdf/dist/Page/AnnotationLayer.css");
    import("react-pdf/dist/Page/TextLayer.css");
  }, []);

  if (!isClient) {
    return <p className="p-4 text-gray-500">Loading PDF viewer…</p>;
  }

  if (!pdfUrl) {
    return <p className="p-4 text-gray-500">No PDF loaded.</p>;
  }

  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      loading={<p className="p-4">Loading PDF…</p>}
    >
      {Array.from(new Array(numPages), (_, i) => (
        <Page key={i} pageNumber={i + 1} scale={1.2} className="mb-4" />
      ))}
    </Document>
  );
}
