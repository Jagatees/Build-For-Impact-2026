export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const worker = await createWorker("eng+tam+hin+ben+msa+chi_sim");

    const {
      data: { text },
    } = await worker.recognize(buffer);

    await worker.terminate();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("OCR ERROR:", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
