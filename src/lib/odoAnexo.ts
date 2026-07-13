// Anexo I do relatório "Por Lista": conteúdo do XLSX enviado pelo usuário.
// Armazenamento em localStorage (chaveado por protocolo mensal AAAA-MM-XXXXXX).
// Contorno intencional: o projeto Supabase do ODO-NRPS é separado e não temos
// migrations aqui — persistir localmente evita mexer no backend externo.

import * as XLSX from "xlsx";

const KEY = (protocolo: string) => `odo-anexo:${protocolo}`;

export type OdoAnexo = {
  filename: string;
  uploadedAt: string; // ISO
  sheet: string;
  headers: string[];
  rows: (string | number | null)[][];
};

export const readAnexo = (protocolo: string): OdoAnexo | null => {
  try {
    const raw = localStorage.getItem(KEY(protocolo));
    return raw ? (JSON.parse(raw) as OdoAnexo) : null;
  } catch {
    return null;
  }
};

export const removeAnexo = (protocolo: string) => {
  localStorage.removeItem(KEY(protocolo));
};

export const parseXlsx = async (file: File): Promise<OdoAnexo> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  const [head = [], ...rest] = aoa;
  return {
    filename: file.name,
    uploadedAt: new Date().toISOString(),
    sheet: sheetName,
    headers: head.map((h) => String(h ?? "")),
    rows: rest,
  };
};

export const saveAnexo = async (protocolo: string, file: File): Promise<OdoAnexo> => {
  const anexo = await parseXlsx(file);
  localStorage.setItem(KEY(protocolo), JSON.stringify(anexo));
  return anexo;
};
