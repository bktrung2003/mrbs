export type EventPosterData = {
  title: string
  startLabel: string
  endLabel: string
  roomLabel: string
  publicUrl: string
  publicSlug?: string | null
  qrSvg: string
  companyName?: string
  checkInLeadMinutes?: number
}

export type EventSurveyPosterData = {
  title: string
  startLabel: string
  endLabel: string
  roomLabel: string
  surveyUrl: string
  surveySlug?: string | null
  qrSvg: string
  companyName?: string
}

const POSTER_BASE_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body {
    width: 281mm;
    height: 194mm;
    margin: 0;
    padding: 0;
    font-family: "Segoe UI", system-ui, sans-serif;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .poster {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: white;
  }
  .info {
    flex: 1 1 58%;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .header {
    color: white;
    padding: 8mm 12mm 7mm;
  }
  .type-badge {
    display: inline-block;
    margin: 0 0 3mm;
    padding: 1.5mm 4mm;
    border-radius: 3mm;
    font-size: 11pt;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: rgba(255,255,255,0.22);
    border: 2px solid rgba(255,255,255,0.55);
  }
  .not-other {
    margin: 2mm 0 0;
    font-size: 9pt;
    font-weight: 600;
    opacity: 0.9;
    letter-spacing: 0.02em;
  }
  .header h1 {
    margin: 0;
    font-size: 22pt;
    line-height: 1.2;
    font-weight: 700;
  }
  .header .meta {
    margin: 3mm 0 0;
    font-size: 12pt;
    line-height: 1.45;
    opacity: 0.97;
  }
  .content {
    flex: 1;
    padding: 8mm 12mm 6mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .content h2 { margin: 0 0 4mm; font-size: 14pt; }
  .steps {
    margin: 0;
    padding-left: 6mm;
    font-size: 13pt;
    line-height: 1.55;
  }
  .steps li { margin: 2.5mm 0; }
  .url {
    margin-top: 6mm;
    padding-top: 4mm;
    border-top: 1px solid #e2e8f0;
    font-family: ui-monospace, monospace;
    font-size: 10pt;
    color: #64748b;
    word-break: break-all;
  }
  .footer {
    padding: 3mm 12mm 5mm;
    font-size: 9pt;
    color: #94a3b8;
  }
  .qr-panel {
    flex: 0 0 42%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8mm;
    text-align: center;
  }
  .scan-label {
    margin: 0 0 5mm;
    font-size: 17pt;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .qr-wrap {
    padding: 5mm;
    background: white;
    border: 3px solid #e2e8f0;
    border-radius: 8mm;
    box-shadow: 0 2mm 8mm rgba(0,0,0,0.08);
  }
  .qr-wrap svg {
    display: block;
    width: 95mm !important;
    height: 95mm !important;
  }
  .qr-hint {
    margin: 5mm 0 0;
    max-width: 95mm;
    font-size: 11pt;
    line-height: 1.45;
  }
  @media print {
    html, body { width: auto; height: auto; }
    .poster { border-width: 3px; border-radius: 0; }
  }
`

export function printEventCheckInPoster(data: EventPosterData): boolean {
  const location = data.roomLabel || "See event details"
  const slugLine = data.publicSlug ? `/events/${data.publicSlug}` : data.publicUrl
  const lead = data.checkInLeadMinutes ?? 30

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.title)} — Check-in poster</title>
  <style>
    ${POSTER_BASE_CSS}
    .poster { border: 4px solid #F59E42; }
    .header { background: linear-gradient(135deg, #D97706 0%, #F59E42 100%); }
    .content h2 { color: #92400E; }
    .qr-panel {
      background: #FEF3E8;
      border-left: 3px solid #F59E42;
    }
    .scan-label { color: #92400E; }
    .qr-hint { color: #B45309; }
  </style>
</head>
<body>
  <div class="poster">
    <div class="info">
      <div class="header">
        <p class="type-badge">✓ Check-in</p>
        <p class="not-other">This poster is for arrival only — not the post-event survey</p>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="meta">${escapeHtml(data.startLabel)} – ${escapeHtml(data.endLabel)}</p>
        <p class="meta">${escapeHtml(location)}</p>
      </div>
      <div class="content">
        <h2>How to check in</h2>
        <ol class="steps">
          <li>Scan the <strong>check-in QR</strong> with your phone camera</li>
          <li>Open the <strong>event page</strong> (orange check-in poster)</li>
          <li>Enter your <strong>email</strong> or <strong>phone number</strong> from registration</li>
          <li>Tap <strong>Check in now</strong> (opens ${lead} min before start)</li>
        </ol>
        <p class="url">${escapeHtml(slugLine)}</p>
      </div>
      <div class="footer">${escapeHtml(data.companyName ?? "Fusion Hotel Group")} · Check-in poster</div>
    </div>
    <div class="qr-panel">
      <p class="scan-label">Scan to check in</p>
      <div class="qr-wrap">${data.qrSvg}</div>
      <p class="qr-hint">Use the same email or mobile number you registered with</p>
    </div>
  </div>
</body>
</html>`

  return printPosterViaIframe(html, "Print event check-in poster")
}

export function printEventSurveyPoster(data: EventSurveyPosterData): boolean {
  const location = data.roomLabel || "See event details"
  const slugLine = data.surveySlug
    ? `/events/survey/${data.surveySlug}`
    : data.surveyUrl

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.title)} — Survey poster</title>
  <style>
    ${POSTER_BASE_CSS}
    .poster { border: 4px solid #3B82F6; }
    .header { background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%); }
    .content h2 { color: #1E40AF; }
    .qr-panel {
      background: #EFF6FF;
      border-left: 3px solid #3B82F6;
    }
    .scan-label { color: #1E40AF; }
    .qr-hint { color: #2563EB; }
  </style>
</head>
<body>
  <div class="poster">
    <div class="info">
      <div class="header">
        <p class="type-badge">★ Post-event survey</p>
        <p class="not-other">This poster is for feedback after the event — not for check-in</p>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="meta">${escapeHtml(data.startLabel)} – ${escapeHtml(data.endLabel)}</p>
        <p class="meta">${escapeHtml(location)}</p>
      </div>
      <div class="content">
        <h2>How to submit feedback</h2>
        <ol class="steps">
          <li>Scan the <strong>survey QR</strong> (blue poster) after the event ends</li>
          <li>Open the <strong>survey page</strong></li>
          <li>Enter your <strong>email</strong> or <strong>phone number</strong> from registration</li>
          <li>Rate the session and tap <strong>Submit survey</strong></li>
        </ol>
        <p class="url">${escapeHtml(slugLine)}</p>
      </div>
      <div class="footer">${escapeHtml(data.companyName ?? "Fusion Hotel Group")} · Survey poster</div>
    </div>
    <div class="qr-panel">
      <p class="scan-label">Scan for survey</p>
      <div class="qr-wrap">${data.qrSvg}</div>
      <p class="qr-hint">Available after the event ends · same email or phone as registration</p>
    </div>
  </div>
</body>
</html>`

  return printPosterViaIframe(html, "Print event survey poster")
}

function printPosterViaIframe(html: string, iframeTitle: string): boolean {
  const iframe = document.createElement("iframe")
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden",
  )
  iframe.setAttribute("title", iframeTitle)
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc || !win) {
    iframe.remove()
    return false
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    iframe.remove()
  }

  win.addEventListener("afterprint", cleanup, { once: true })

  const triggerPrint = () => {
    try {
      win.focus()
      win.print()
    } catch {
      cleanup()
      return false
    }
    setTimeout(cleanup, 60_000)
    return true
  }

  if (doc.readyState === "complete") {
    return triggerPrint()
  }

  win.addEventListener("load", () => triggerPrint(), { once: true })
  setTimeout(() => triggerPrint(), 400)
  return true
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
