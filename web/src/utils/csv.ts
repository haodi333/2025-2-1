import JSZip from 'jszip';
import Papa from 'papaparse';

export type ColumnType = string | number;

export function parseCsv(file: File): Promise<Record<string, ColumnType[]>> {
    return new Promise((resolve, reject) => {
        Papa.parse<Record<string, ColumnType>>(file, {
            dynamicTyping: true,
            complete: (result) => {
                const state: Record<string, ColumnType[]> = {};
                result.data.forEach(row => {
                    const kvs = Object.entries(row)
                    if (kvs.some(([, value]) => !value)) return;
                    for (const [key, value] of kvs) {
                        if (!state[key]) {
                            state[key] = [];
                        }
                        state[key].unshift(value);
                    }
                });
                resolve(state);
            },
            error: (error: unknown) => {
                reject(error);
            },
        });
    });
}

export function parseZip(file: Blob) {
    return new Promise<File[]>((resolve, reject) => {
        const zip = new JSZip();
        const reader = new FileReader();
        reader.onload = async (e) => {
            const zipContent = await zip.loadAsync(e.target?.result as ArrayBuffer);
            const filesPromise: Promise<Blob>[] = [];
            const names: string[] = [];
            zipContent.forEach((_, zipEntry) => {
                if (zipEntry.name.endsWith('.csv')) {
                    filesPromise.push(zipEntry.async('blob'));
                    names.push(zipEntry.name);
                }
            });
            Promise.all(filesPromise).then((files) => {
                resolve(files.map((file, index) => new File([file], names[index], { type: 'text/csv' })));
            });
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}