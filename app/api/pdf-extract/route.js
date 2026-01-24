import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf')

    if (!pdfFile) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      )
    }

    // Check if it's a PDF file
    if (pdfFile.type !== 'application/pdf' && !pdfFile.name?.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Use require for server-side to avoid webpack bundling issues
    // pdf-parse v2 exports PDFParse as a class that must be instantiated
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse')
    
    // Get the PDFParse class - it's exported as a property
    const PDFParse = pdfParseModule.PDFParse
    
    if (!PDFParse) {
      throw new Error('PDFParse class not found. Available exports: ' + Object.keys(pdfParseModule).join(', '))
    }
    
    // Instantiate PDFParse with buffer data
    // PDFParse accepts { data: Buffer } or { url: string }
    const parser = new PDFParse({ data: buffer })
    
    // Extract text from PDF using the getText() method
    const result = await parser.getText()
    const extractedText = result.text

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF. The PDF might be image-based or empty.' },
        { status: 400 }
      )
    }

    // Get additional info if available
    const info = await parser.getInfo().catch(() => ({}))
    
    return NextResponse.json({
      success: true,
      text: extractedText,
      pages: result.pages || info.pages || 1,
      info: {
        title: info.title || pdfFile.name,
        author: info.author || 'Unknown'
      }
    })
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from PDF' },
      { status: 500 }
    )
  }
}
