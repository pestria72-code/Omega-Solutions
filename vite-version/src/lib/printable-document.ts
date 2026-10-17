export function escapeDocumentText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function printBusinessDocument(title: string, documentNumber: string, content: string) {
  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) { window.alert("Your browser blocked the document window. Allow pop-ups for Omega Solutions, then try again."); return; }
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeDocumentText(title)} ${escapeDocumentText(documentNumber)}</title>
<style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#20242b;font-size:12px;line-height:1.45;margin:0}.brand{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#28734f}.top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #28734f;padding-bottom:18px;margin-bottom:24px}h1{font-size:28px;letter-spacing:-.04em;margin:4px 0 0}.muted{color:#68717d}.meta{text-align:right}.meta strong{display:block;font-size:16px}section{margin:18px 0}.section-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#68717d;font-weight:700;margin-bottom:6px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#f0f4f2;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#4b555f}th,td{padding:10px 8px;border-bottom:1px solid #e2e6e9}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}.totals{width:min(320px,100%);margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:16px;font-weight:700;border-top:2px solid #20242b;padding-top:10px;margin-top:6px}.note{margin-top:26px;padding:12px;background:#f7f8f8;border-radius:4px;white-space:pre-wrap}.footer{margin-top:42px;padding-top:12px;border-top:1px solid #e2e6e9;color:#68717d;font-size:10px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>${content}<div class="footer">Prepared from business accounting records. Keep this document with your accounting records.</div><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),250)});</script></body></html>`);
  popup.document.close();
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    if (/^[=+@\t\r]/.test(text) || /^-/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}


export function downloadBusinessDocument(title: string, documentNumber: string, content: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeDocumentText(title)} ${escapeDocumentText(documentNumber)}</title>
<style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#20242b;font-size:12px;line-height:1.45;margin:0}.brand{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#28734f}.top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #28734f;padding-bottom:18px;margin-bottom:24px}h1{font-size:28px;letter-spacing:-.04em;margin:4px 0 0}.muted{color:#68717d}.meta{text-align:right}.meta strong{display:block;font-size:16px}section{margin:18px 0}.section-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#68717d;font-weight:700;margin-bottom:6px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#f0f4f2;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#4b555f}th,td{padding:10px 8px;border-bottom:1px solid #e2e6e9}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}.totals{width:min(320px,100%);margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:16px;font-weight:700;border-top:2px solid #20242b;padding-top:10px;margin-top:6px}.note{margin-top:26px;padding:12px;background:#f7f8f8;border-radius:4px;white-space:pre-wrap}.footer{margin-top:42px;padding-top:12px;border-top:1px solid #e2e6e9;color:#68717d;font-size:10px}
</style></head><body>${content}<div class="footer">Prepared from business accounting records. Keep this document with your accounting records.</div></body></html>`;
  const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${String(documentNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
