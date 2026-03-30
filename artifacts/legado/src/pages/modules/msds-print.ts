// ── Album MSDS HTML builder ───────────────────────────────────────────────────
// Pure function extracted from MsdsPage.handlePrintAlbum.
// Accepts pre-generated QR data URLs so QRCode.toDataURL stays in the component.

export interface MsdsProduct {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  category?: string | null;
  hazardLevel?: string | null;
  hazardPictograms?: string | null;
  firstAid?: string | null;
  msdsUrl?: string | null;
}

function levelConfig(level: string | null | undefined): { color: string; label: string } {
  if (level === "alto_riesgo") return { color: "#c0392b", label: "⚠ PRODUCTO QUÍMICO – ALTO RIESGO" };
  if (level === "controlado")  return { color: "#1a3a5c", label: "⚠ PRODUCTO QUÍMICO – USO CONTROLADO" };
  return { color: "#e67e22", label: "⚠ PRODUCTO QUÍMICO – PRECAUCIÓN" };
}

const D = `<polygon points="50,3 97,50 50,97 3,50" fill="white" stroke="#cc0000" stroke-width="7" stroke-linejoin="round"/>`;
const ghsPictos: Record<string, string> = {
  toxico: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <ellipse cx="50" cy="43" rx="17" ry="15" fill="black"/>
    <ellipse cx="43" cy="41" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="57" cy="41" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="50" cy="48" rx="2.5" ry="2.5" fill="white"/>
    <rect x="37" y="53" width="26" height="8" rx="2" fill="black"/>
    <rect x="41" y="53" width="3" height="8" fill="white"/>
    <rect x="47" y="53" width="3" height="8" fill="white"/>
    <rect x="53" y="53" width="3" height="8" fill="white"/>
    <line x1="28" y1="68" x2="72" y2="76" stroke="black" stroke-width="6" stroke-linecap="round"/>
    <line x1="28" y1="76" x2="72" y2="68" stroke="black" stroke-width="6" stroke-linecap="round"/>
    <circle cx="25" cy="72" r="6" fill="black"/>
    <circle cx="75" cy="72" r="6" fill="black"/>
  </svg>`,
  inflamable: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <path d="M50,78 C33,78 26,63 29,49 C31,38 38,33 40,25 C42,18 40,12 40,12
             C46,18 48,28 47,36 C49,30 52,20 57,16 C57,24 54,33 56,40
             C60,33 63,29 67,31 C73,41 72,55 67,65 C63,73 57,78 50,78Z" fill="black"/>
  </svg>`,
  oxidante: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <circle cx="50" cy="68" r="14" fill="none" stroke="black" stroke-width="5"/>
    <path d="M50,56 C40,56 34,45 37,34 C39,26 44,22 44,22
             C46,29 46,36 45,42 C47,36 51,26 56,22 C56,30 53,38 55,44
             C59,37 63,33 66,36 C71,44 69,55 63,58 C59,59 55,57 50,56Z" fill="black"/>
  </svg>`,
  gas_presion: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <rect x="38" y="44" width="24" height="30" rx="5" fill="black"/>
    <ellipse cx="50" cy="44" rx="12" ry="7" fill="black"/>
    <rect x="45" y="30" width="10" height="7" rx="2" fill="black"/>
    <rect x="42" y="27" width="16" height="5" rx="2" fill="black"/>
    <line x1="58" y1="30" x2="68" y2="30" stroke="black" stroke-width="4" stroke-linecap="round"/>
    <rect x="34" y="72" width="32" height="5" rx="2" fill="black"/>
  </svg>`,
  corrosivo: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <rect x="25" y="20" width="16" height="20" rx="2" fill="none" stroke="black" stroke-width="4"/>
    <path d="M30,40 Q28,50 27,57" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M20,65 Q24,59 27,65 Q30,71 33,65" stroke="black" stroke-width="3.5" fill="none"/>
    <rect x="59" y="20" width="16" height="20" rx="2" fill="none" stroke="black" stroke-width="4"/>
    <path d="M66,40 Q68,50 70,57" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M56,62 Q60,56 67,58 Q73,60 75,67 Q71,74 62,74 Q56,72 56,62Z" fill="black"/>
    <ellipse cx="63" cy="64" rx="3" ry="2.5" fill="white"/>
    <ellipse cx="69" cy="68" rx="3" ry="2.5" fill="white"/>
  </svg>`,
  nocivo: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <rect x="44" y="26" width="12" height="32" rx="6" fill="black"/>
    <circle cx="50" cy="70" r="7" fill="black"/>
  </svg>`,
  peligro_ambiental: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <rect x="46" y="52" width="8" height="22" fill="black"/>
    <line x1="50" y1="55" x2="33" y2="40" stroke="black" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="50" y1="55" x2="67" y2="40" stroke="black" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="50" y1="47" x2="37" y2="32" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="47" x2="63" y2="32" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="40" x2="50" y2="25" stroke="black" stroke-width="4" stroke-linecap="round"/>
    <path d="M62,63 Q70,58 76,62 Q70,69 62,63Z" fill="black"/>
    <path d="M56,62 L62,58 L62,67Z" fill="black"/>
    <circle cx="72" cy="61" r="1.8" fill="white"/>
    <line x1="26" y1="74" x2="74" y2="74" stroke="black" stroke-width="3.5"/>
  </svg>`,
  peligro_salud: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <circle cx="50" cy="28" r="9" fill="black"/>
    <path d="M40,40 Q36,57 34,72 L43,72 L48,58 L52,58 L57,72 L66,72 Q64,57 60,40 Z" fill="black"/>
    <line x1="42" y1="50" x2="52" y2="50" stroke="white" stroke-width="3"/>
    <line x1="47" y1="45" x2="47" y2="55" stroke="white" stroke-width="3"/>
    <line x1="43" y1="46" x2="51" y2="54" stroke="white" stroke-width="2.5"/>
    <line x1="51" y1="46" x2="43" y2="54" stroke="white" stroke-width="2.5"/>
  </svg>`,
  explosivo: `<svg width="36" height="36" viewBox="0 0 100 100">${D}
    <path d="M50,72 L38,56 L21,60 L35,47 L26,31 L42,40 L50,22 L58,40 L74,31 L65,47 L79,60 L62,56 Z" fill="black"/>
    <path d="M50,64 L41,53 L30,56 L40,47 L34,36 L46,43 L50,32 L54,43 L66,36 L60,47 L70,56 L59,53 Z" fill="white"/>
    <circle cx="50" cy="50" r="7" fill="black"/>
  </svg>`,
};

function renderPictos(raw: string | null | undefined): string {
  let keys: string[] = [];
  try { keys = JSON.parse(raw ?? "[]") as string[]; } catch { /* empty */ }
  if (!keys.length) return "";
  const icons = keys.map((k) => ghsPictos[k] ?? "").filter(Boolean).join("");
  return `<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;flex-shrink:0;max-width:80px;">${icons}</div>`;
}

function renderFirstAid(text: string | null | undefined, color: string): string {
  const items = text?.trim()
    ? text.split(/[·\n]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const bullets = items.length
    ? items.map((i) => `<div style="margin-bottom:2px;">• ${i}</div>`).join("")
    : `<div style="color:#aaa;font-style:italic;">Sin instrucciones registradas</div>`;
  return `<div style="background:#fff8e1;border-top:1px solid #eee;padding:5px 8px;font-size:7.5px;color:#333;line-height:1.5;flex:1;">
    <div style="font-weight:bold;color:${color};margin-bottom:3px;font-size:8px;">ⓘ En caso de contacto:</div>
    ${bullets}
  </div>`;
}

export function buildMsdsAlbumHtml(
  products: MsdsProduct[],
  qrDataUrls: Record<string, string>,
  warehouseLabel: string,
): string {
  const chunks: MsdsProduct[][] = [];
  for (let i = 0; i < products.length; i += 6) chunks.push(products.slice(i, i + 6));

  const pagesHtml = chunks.map((chunk) => {
    const cards = chunk.map((p) => {
      const { color, label } = levelConfig(p.hazardLevel);
      const pictoHtml = renderPictos(p.hazardPictograms);
      const firstAidHtml = renderFirstAid(p.firstAid, color);
      return `
      <div class="card" style="border:2px solid ${color};display:flex;flex-direction:column;">
        <div style="background:${color};color:white;text-align:center;padding:4px 6px;font-size:9px;font-weight:bold;letter-spacing:0.5px;flex-shrink:0;">${label}</div>
        <div style="display:flex;align-items:flex-start;padding:5px 7px;gap:5px;border-bottom:1px solid #eee;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:bold;color:#111;text-transform:uppercase;line-height:1.2;">${p.name}</div>
            <div style="font-size:8px;color:#555;margin-top:3px;">Código: <strong>${p.code}</strong></div>
            <div style="font-size:8px;color:#555;">Área: <strong>${p.warehouse}</strong></div>
            ${p.category ? `<div style="font-size:8px;color:#555;">Tipo: ${p.category}</div>` : ""}
          </div>
          ${pictoHtml}
        </div>
        <div style="display:flex;align-items:stretch;border-bottom:1px solid #eee;flex-shrink:0;">
          ${qrDataUrls[p.id] ? `<img src="${qrDataUrls[p.id]}" width="95" height="95" alt="QR" style="flex-shrink:0;display:block;border-right:1px solid #eee;">` : `<div style="width:95px;height:95px;flex-shrink:0;border-right:1px solid #eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;">Sin QR</div>`}
          <div style="flex:1;min-width:0;padding:6px 8px;background:${color}0d;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:4px;">
            <div style="font-size:7px;font-weight:bold;color:${color};letter-spacing:0.5px;text-transform:uppercase;">Escanea para ver</div>
            <div style="font-size:8px;font-weight:bold;color:${color};letter-spacing:0.5px;text-transform:uppercase;">MSDS Completa</div>
            <div style="font-size:11px;font-weight:bold;color:#1a1a2e;letter-spacing:1px;border-top:1px dashed ${color}80;padding-top:4px;width:100%;">${p.code}</div>
          </div>
        </div>
        ${firstAidHtml}
        <div style="padding:6px 8px;border-top:1px solid #eee;background:#fafafa;text-align:center;flex-shrink:0;">
          <svg class="barcode-lg" data-code="${p.code}" style="width:90%;height:36px;display:inline-block;"></svg>
          <div style="font-size:8px;color:#666;margin-top:2px;letter-spacing:1px;">${p.code}</div>
        </div>
      </div>`;
    }).join("");

    return `
      <div style="background:#c0392b;color:white;text-align:center;padding:6px;font-size:13px;font-weight:bold;letter-spacing:1px;margin-bottom:8px;">
        ⚠ PRODUCTOS QUÍMICOS – FICHAS DE SEGURIDAD MSDS
      </div>
      <div class="page">${cards}</div>
      <div style="text-align:center;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:4px;margin-top:6px;">
        Documento confidencial de uso interno – en caso de emergencia contactar al responsable del almacén
      </div>
      <div class="page-break"></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Álbum MSDS — ${warehouseLabel}</title>
  <style>
    @page { size: A4 portrait; margin: 0.8cm; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
    .page {
      width: 100%;
      height: 26.7cm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(3, 1fr);
      gap: 0.5cm;
      box-sizing: border-box;
    }
    .page-break { break-after: page; page-break-after: always; }
    .card {
      border: 2px solid #ccc;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.onload = function() {
      document.querySelectorAll('.barcode-lg').forEach(function(el) {
        JsBarcode(el, el.dataset.code, { format: 'CODE128', displayValue: false, height: 32, margin: 0, width: 1.4 });
      });
      window.print();
    };
    document.head.appendChild(script);
  <\/script>
</body>
</html>`;
}
