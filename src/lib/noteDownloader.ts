import { Note } from '../types';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

/**
 * Sanitizes a string for use as a filename
 */
export function sanitizeFilename(name: string): string {
  return (name || 'StudySnap_Note')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'StudySnap_Note';
}

/**
 * Trigger browser file download from Blob or URL
 */
export function triggerDownload(blobOrUrl: Blob | string, filename: string) {
  const isUrl = typeof blobOrUrl === 'string';
  const url = isUrl ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (!isUrl) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Download HTML Note as a full standalone HTML file (.html)
 */
export function downloadNoteAsHtml(note: Note) {
  const filename = `${sanitizeFilename(note.title)}.html`;
  
  // Build rich HTML body
  let mainBodyHtml = '';
  if (note.htmlContent) {
    mainBodyHtml = note.htmlContent;
  } else if (note.htmlUrl) {
    mainBodyHtml = `
      <div class="embed-box">
        <p><strong>External Resource Link:</strong> <a href="${note.htmlUrl}" target="_blank" rel="noopener">${note.htmlUrl}</a></p>
        <iframe src="${note.htmlUrl}" title="${note.title}" style="width: 100%; height: 650px; border: none; border-radius: 12px;"></iframe>
      </div>
    `;
  } else if (note.content) {
    // Escape or render text
    const escaped = note.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    mainBodyHtml = `<div class="text-content">${escaped}</div>`;
  } else {
    mainBodyHtml = `<p><em>${note.description || 'No direct content body available.'}</em></p>`;
  }

  // Standalone HTML template
  const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} - StudySnap Note</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --badge-bg: #dbeafe;
      --badge-text: #1e40af;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f19;
        --card-bg: #111827;
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --border: #1f2937;
        --badge-bg: #1e293b;
        --badge-text: #60a5fa;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Noto Sans Bengali";
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.65;
      padding: 24px 16px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
    }
    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: white;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 900;
      line-height: 1.25;
      margin-bottom: 10px;
      color: var(--text);
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      font-size: 13px;
      color: var(--text-muted);
    }
    .badge {
      display: inline-block;
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 3px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
    }
    .description {
      margin-top: 10px;
      font-size: 14px;
      color: var(--text-muted);
      font-style: italic;
    }
    .content {
      font-size: 16px;
      color: var(--text);
    }
    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 16px 0;
    }
    .content pre, .content code {
      background: #f1f5f9;
      border-radius: 8px;
      font-family: monospace;
      padding: 4px 8px;
    }
    .content pre {
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed var(--border);
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    @media print {
      body { background: white; color: black; padding: 0; }
      .container { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">StudySnap • Study Note</div>
      <h1>${note.title}</h1>
      <div class="meta-bar">
        <span class="badge">${note.subject}</span>
        <span>• Format: <strong>HTML Note (.html)</strong></span>
        <span>• Date: ${new Date(note.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
      ${note.description ? `<p class="description">${note.description}</p>` : ''}
    </div>

    <div class="content">
      ${mainBodyHtml}
    </div>

    <div class="footer">
      <p>StudySnap • Created for students by Subhajit Sanpui (© Smart Subha)</p>
      <p>Downloaded on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, filename);
  toast.success(`HTML Note downloaded: ${filename}`);
}

/**
 * Download Text Note (.txt / .md)
 */
export function downloadNoteAsText(note: Note, format: 'txt' | 'md' = 'txt') {
  const filename = `${sanitizeFilename(note.title)}.${format}`;
  const header = `=====================================================
StudySnap - Study Resource
Title: ${note.title}
Subject: ${note.subject}
Date: ${new Date(note.createdAt || Date.now()).toLocaleDateString()}
Format: ${note.type.toUpperCase()} Note
=====================================================
${note.description ? `Description:\n${note.description}\n\n` : ''}Content:
-----------------------------------------------------
`;
  const body = note.content || note.description || 'No direct text content available.';
  const footer = `\n\n-----------------------------------------------------
StudySnap • Empowering Students • © Smart Subha
Downloaded: ${new Date().toLocaleString()}
`;
  const fullText = header + body + footer;
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename);
  toast.success(`Text Note downloaded: ${filename}`);
}

/**
 * Download PDF Note directly or trigger file fetch
 */
export async function downloadNotePdfFile(note: Note) {
  if (note.pdfUrl) {
    try {
      toast.info("Downloading PDF file...");
      // Try direct blob fetch for cleaner local save
      const res = await fetch(note.pdfUrl);
      if (res.ok) {
        const blob = await res.blob();
        triggerDownload(blob, `${sanitizeFilename(note.title)}.pdf`);
        toast.success("PDF Downloaded successfully!");
        return;
      }
    } catch {
      // Fallback to window open / anchor download
    }
    triggerDownload(note.pdfUrl, `${sanitizeFilename(note.title)}.pdf`);
    toast.success("Opening PDF download link...");
  } else {
    // If no direct pdfUrl, export the note view as PDF
    toast.info("Generating PDF document...");
    await exportElementToPdf(`note-content-${note.id}`, `${sanitizeFilename(note.title)}.pdf`);
  }
}

/**
 * Download Voice / Audio file (.mp3 / .wav)
 */
export async function downloadNoteVoice(note: Note) {
  if (!note.voiceUrl) {
    toast.error("Audio link not found for this note");
    return;
  }
  try {
    toast.info("Downloading audio note...");
    const res = await fetch(note.voiceUrl);
    if (res.ok) {
      const blob = await res.blob();
      triggerDownload(blob, `${sanitizeFilename(note.title)}.mp3`);
      toast.success("Audio note saved!");
      return;
    }
  } catch {}
  triggerDownload(note.voiceUrl, `${sanitizeFilename(note.title)}.mp3`);
  toast.success("Started audio download");
}

/**
 * Download Video note (.mp4)
 */
export async function downloadNoteVideo(note: Note) {
  if (!note.videoUrl) {
    toast.error("Video link not found for this note");
    return;
  }
  try {
    toast.info("Downloading video note...");
    const res = await fetch(note.videoUrl);
    if (res.ok) {
      const blob = await res.blob();
      triggerDownload(blob, `${sanitizeFilename(note.title)}.mp4`);
      toast.success("Video note saved!");
      return;
    }
  } catch {}
  triggerDownload(note.videoUrl, `${sanitizeFilename(note.title)}.mp4`);
  toast.success("Started video download");
}

/**
 * Download Image note
 */
export async function downloadNoteImages(note: Note) {
  if (!note.images || note.images.length === 0) {
    toast.error("No images found in this note");
    return;
  }
  toast.info(`Downloading ${note.images.length} image(s)...`);
  note.images.forEach((imgUrl, idx) => {
    setTimeout(async () => {
      try {
        const res = await fetch(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          triggerDownload(blob, `${sanitizeFilename(note.title)}_page_${idx + 1}.jpg`);
          return;
        }
      } catch {}
      triggerDownload(imgUrl, `${sanitizeFilename(note.title)}_page_${idx + 1}.jpg`);
    }, idx * 400);
  });
  toast.success("Images downloaded!");
}

/**
 * Download Note according to its specific format:
 * - HTML -> .html file
 * - Text -> .txt / .md file
 * - PDF -> .pdf file
 * - Image -> images
 * - Voice -> .mp3 file
 * - Video -> .mp4 file
 */
export async function downloadNoteByNativeFormat(note: Note) {
  switch (note.type) {
    case 'html':
      downloadNoteAsHtml(note);
      break;
    case 'text':
      downloadNoteAsText(note, 'txt');
      break;
    case 'pdf':
      await downloadNotePdfFile(note);
      break;
    case 'image':
      await downloadNoteImages(note);
      break;
    case 'voice':
      await downloadNoteVoice(note);
      break;
    case 'video':
      await downloadNoteVideo(note);
      break;
    default:
      if (note.htmlContent || note.htmlUrl) {
        downloadNoteAsHtml(note);
      } else if (note.pdfUrl) {
        await downloadNotePdfFile(note);
      } else {
        downloadNoteAsText(note, 'txt');
      }
      break;
  }
}

/**
 * Export HTML element to PDF via html2pdf.js
 */
export async function exportElementToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Note content element not found for export");
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const iframes = clone.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const container = document.createElement('div');
    container.className = "p-6 bg-slate-100 border-2 border-dashed rounded-3xl my-6 text-[10px] font-black uppercase text-slate-400 text-center";
    container.innerText = "Interactive component removed for PDF export";
    iframe.parentNode?.replaceChild(container, iframe);
  });

  const opt = {
    margin: 10,
    filename: filename || 'StudySnap_Note.pdf',
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1.5, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // @ts-ignore
  await html2pdf().set(opt).from(clone).save();
  toast.success("PDF saved successfully!");
}

/**
 * Export HTML element to Image (PNG / JPEG) via html2canvas
 */
export async function exportElementToImage(elementId: string, filename: string, format: 'png' | 'jpeg') {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Note element not found for image export");
    return;
  }

  const canvas = await html2canvas(element, {
    useCORS: true,
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const mimeType = `image/${format}`;
  const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.95 : undefined);
  triggerDownload(dataUrl, filename);
  toast.success(`${format.toUpperCase()} Image Saved!`);
}
