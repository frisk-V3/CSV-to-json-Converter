/**
 * CSV to JSON Converter - Professional Stream Edition
 * 
 * 巷の「全表示」コードとは一線を画す、メモリ管理を重視した設計。
 * 巨大なJSONをtextareaに流し込むブラウザの限界を、
 * 「プレビュー表示 + Blobダウンロード」というIDEの手法で解決します。
 */

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const jsonOutput = document.getElementById('jsonOutput');
const statusMsg = document.getElementById('statusMsg'); // HTMLに <span id="statusMsg"></span> を追加推奨

// --- UIイベント ---

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        dropZone.querySelector('p').innerText = `選択済み: ${fileInput.files[0].name}`;
    }
});

convertBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return alert('CSVファイルを選択してください');

    const reader = new FileReader();
    convertBtn.disabled = true;
    convertBtn.innerText = "変換中...";

    reader.onload = (e) => {
        try {
            const csvData = e.target.result;
            const jsonData = parseCSV(csvData);
            
            const isPretty = document.getElementById('prettyPrint').checked;
            const indent = isPretty ? 4 : 0;

            // 【激重対策】全データを表示せず、最初の20件だけプレビュー
            const previewData = jsonData.slice(0, 20);
            jsonOutput.value = JSON.stringify(previewData, null, indent) + 
                               "\n\n... (以下略: 全データはダウンロードボタンから取得してください)";

            // 【メモリ対策】全データはBlobとしてバイナリで保持
            const fullJson = JSON.stringify(jsonData, null, indent);
            const blob = new Blob([fullJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name.replace('.csv', '.json');
                a.click();
            };
            downloadBtn.disabled = false;
            
            alert(`${jsonData.length}件のデータを変換しました！`);
        } catch (err) {
            console.error(err);
            alert('エラーが発生しました。');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerText = "変換開始";
        }
    };
    reader.readAsText(file);
});

/**
 * 爆速ステートマシン・パーサー
 * 正規表現を捨て、O(n) のスキャンのみで完走します。
 */
function parseCSV(csv) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    // 改行コードの正規化
    const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n') {
                currentField = currentField.trim();
                currentRow.push(currentField);
                if (currentRow.some(c => c !== '')) rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    // 残り
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    // ヘッダーとデータのマッピング
    const headers = rows[0]; // 1行目をヘッダーに固定
    const shouldConvert = document.getElementById('convertTypes').checked;

    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            let val = row[i] || "";
            if (shouldConvert && val !== '') {
                const lVal = val.toLowerCase();
                if (lVal === 'true') val = true;
                else if (lVal === 'false') val = false;
                else if (!isNaN(val)) val = Number(val);
            }
            obj[header || `col_${i}`] = val;
        });
        return obj;
    });
}
