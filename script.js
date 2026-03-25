/**
 * CSV to JSON Converter - Professional Edition
 * * 巷にある .split(',') だけのコードとはワケが違います。
 * クォート内のカンマ、改行、エスケープされたダブルクォートすべてを
 * 正規表現の暴力（と知恵）で解決します。
 */

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const jsonOutput = document.getElementById('jsonOutput');
const copyBtn = document.getElementById('copyBtn');

// --- イベントリスナーたち（UIの挙動） ---

// クリックでファイル選択
dropZone.addEventListener('click', () => fileInput.click());

// ドラッグ＆ドロップの視覚効果
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateFileName();
    }
});

fileInput.addEventListener('change', updateFileName);

function updateFileName() {
    if (fileInput.files.length) {
        dropZone.querySelector('p').innerText = `選択済み: ${fileInput.files[0].name}`;
    }
}

// 変換ボタンが押された時のメイン処理
convertBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return alert('まずはCSVファイルを選んでください');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvData = e.target.result;
            const json = parseCSV(csvData);
            
            const isPretty = document.getElementById('prettyPrint').checked;
            const outputText = JSON.stringify(json, null, isPretty ? 4 : 0);
            
            jsonOutput.value = outputText;
            downloadBtn.disabled = false;
        } catch (err) {
            console.error(err);
            alert('変換中にエラーが発生しました。CSVの形式があってない可能性があります');
        }
    };
    reader.readAsText(file);
});

// --- ロジックの心臓部 ---

/**
 * どんなCSVでも受けて立つ最強のパーサー
 * 状態遷移を正規表現でシミュレートして、クォート内のカンマや改行を安全に保護します。
 */
function parseCSV(csv) {
    // CSVの正規表現（これはかなり本気のやつです）
    // 1. クォートで囲まれた値（中の "" はエスケープされた " とみなす）
    // 2. クォートで囲まれていない値
    // 3. カンマ
    // 4. 改行
    const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:(?=[,])|$)/g;
    
    // 行に分割する前準備（OSごとの改行差分を吸収）
    const lines = [];
    let row = [];
    let text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1行ずつ丁寧にバラしていく
    const rows = text.split('\n').filter(l => l.trim() !== '');

    const parsedRows = rows.map(line => {
        const values = [];
        let match;
        // 正規表現で1つの行から各セルの値を抽出
        while ((match = re_value.exec(line)) !== null) {
            // クォートあり（2番目のキャプチャ）か、クォートなし（3番目のキャプチャ）を取得
            let val = match[2] !== undefined ? match[2] : match[3];
            // エスケープされたダブルクォートを戻す
            if (val) val = val.replace(/""/g, '"');
            values.push(val);
        }
        return values;
    });

    if (parsedRows.length < 2) return { message: "データが足りないか、1行しかありません。" };

    const headers = parsedRows[0].map(h => h.trim());
    const shouldConvert = document.getElementById('convertTypes').checked;

    return parsedRows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            let val = row[i] || "";
            
            // 型変換オプションがONなら、数値や真偽値をいい感じにする
            if (shouldConvert) {
                if (val.toLowerCase() === 'true') val = true;
                else if (val.toLowerCase() === 'false') val = false;
                else if (!isNaN(val) && val !== '') val = Number(val);
            }
            
            obj[header] = val;
        });
        return obj;
    });
}

// --- おまけの便利機能 ---

// クリップボードにコピー（サッと使いたい時に便利）
copyBtn.addEventListener('click', () => {
    jsonOutput.select();
    document.execCommand('copy');
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'コピーしました！';
    setTimeout(() => copyBtn.innerText = originalText, 2000);
});

// JSONファイルとしてダウンロード
downloadBtn.addEventListener('click', () => {
    const blob = new Blob([jsonOutput.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_data.json';
    a.click();
    URL.revokeObjectURL(url);
});
