import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function downloadJSON(filename: string, payload: any) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) {
    triggerDownload(new Blob([""], { type: "text/csv" }), `${filename}.csv`);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv" }), `${filename}.csv`);
}

export function downloadExcel(filename: string, sheets: Record<string, Record<string, any>[]>) {
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadPDF(filename: string, opts: {
  title: string;
  subtitle?: string;
  summary?: { label: string; value: string }[];
  tables: { heading: string; columns: string[]; rows: (string | number)[][] }[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // header bar
  doc.setFillColor(20, 24, 40);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(opts.title, 40, 38);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 220);
    doc.text(opts.subtitle, 40, 56);
  }

  doc.setTextColor(30, 30, 30);
  let y = 100;

  if (opts.summary && opts.summary.length) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    opts.summary.forEach((s) => {
      doc.text(`${s.label}:`, 40, y);
      doc.text(s.value, 200, y);
      y += 14;
    });
    y += 8;
  }

  opts.tables.forEach((t) => {
    autoTable(doc, {
      startY: y,
      head: [t.columns],
      body: t.rows,
      headStyles: { fillColor: [34, 197, 150], textColor: 20 },
      styles: { fontSize: 9, cellPadding: 5 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text(`FinSpark — ${opts.title}`, 40, doc.internal.pageSize.getHeight() - 20);
        doc.text(`Page ${data.pageNumber}`, W - 60, doc.internal.pageSize.getHeight() - 20);
      },
      margin: { top: 90 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 24;
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 60;
    }
    doc.setTextColor(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(t.heading, 40, y);
    y += 12;
  });

  doc.save(`${filename}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
