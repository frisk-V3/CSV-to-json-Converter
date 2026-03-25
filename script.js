/**
 * CSV to JSON Converter - Turbo Edition
 * 正規表現のバックトラッキング地獄（指数関数的な遅延）を卒業。
 * 1文字ずつ状態を判定しながら進む「ステートマシン」方式により、
 * 巨大なCSVでもフリーズせずに O(n) の速度で完走します。
 */

// --- UI制御（前回と同じ） ---
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const convertBtn = document.getElementById('convertBtn');
const jsonOutput = document.getElementById('jsonOutput');

// --- ロジックの心臓部：爆速スキャナー ---

function parseCSV(csv) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    // 改行コードを統一して1文字ずつ処理開始
    const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    /**
     * 【ステートマシンの核心】
     * 正規表現を使わず、現在の文字が「クォートの中か外か」の状態だけを管理。
     * これにより、クォート内のカンマや改行を完璧に保護しつつ、
     * 計算回数を「文字数分だけ」に固定します。
     */
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            // クォート内部の処理
            if (char === '"' && nextChar === '"') {
                // エスケープされたダブルクォート ("") は1つの " として扱う
                currentField += '"';
                i++; // 次の " をスキップ
            } else if (char === '"') {
                // クォートが閉じた！
                inQuotes = false;
            } else {
                // クォート内なら、カンマも改行もただの文字として吸収
                currentField += char;
            }
        } else {
            // クォート外部の処理
            if (char === '"') {
                // クォート開始
                inQuotes = true;
            } else if (char === ',') {
                // フィールドの区切り。これまでの蓄積を確定
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n') {
                // 行の区切り。1行完成！
                currentField = currentField.trim();
                if (currentField !== '' || currentRow.length > 0) {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            } else {
                // 通常の文字をバッファに溜める
                currentField += char;
            }
        }
    }

    // 最後の1行が改行で終わっていない場合の救済処置
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return { message: "データが足りないか、1行しかありません。" };

    // --- ヘッダーとのマッピング処理 ---
    const headers = rows[0].map(h => h.trim());
    const shouldConvert = document.getElementById('convertTypes').checked;

    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            let val = row[i] !== undefined ? row[i] : "";
            
            // 型変換：数値や真偽値を賢く判定
            if (shouldConvert && val !== '') {
                const lowerVal = val.toLowerCase();
                if (lowerVal === 'true') val = true;
                else if (lowerVal === 'false') val = false;
                else if (!isNaN(val)) val = Number(val);
            }
            obj[header] = val;
        });
        return obj;
    });
}
