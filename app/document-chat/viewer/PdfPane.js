"use client";

import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default function PdfPane() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    const url = sessionStorage.getItem("pdfUrl");
    setPdfUrl(url);
  }, []);

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
