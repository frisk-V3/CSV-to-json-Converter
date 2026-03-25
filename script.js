/**
 * 爆速ステートマシン・パーサー (Worker版)
 * UIスレッドを邪魔せず、バックグラウンドで黙々と計算します。
 */
self.onmessage = function(e) {
    const { csv, shouldConvert, isPretty } = e.data;
    
    try {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        // 改行差分吸収
        const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 1文字ずつなめる (O(n) のスキャン)
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
                    currentRow.push(currentField.trim());
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }
        // 最終行の残り
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
        }

        if (rows.length < 2) throw new Error("有効なデータ行が見つかりません。");

        // ヘッダー処理とJSON化
        const headers = rows[0];
        const jsonData = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                let val = row[i] || "";
                if (shouldConvert && val !== '') {
                    const lVal = val.toLowerCase();
                    if (lVal === 'true') val = true;
                    else if (lVal === 'false') val = false;
                    else if (!isNaN(val)) val = Number(val);
                }
                obj[header] = val;
            });
            return obj;
        });

        // 文字列化してメインスレッドに返却
        const jsonString = JSON.stringify(jsonData, null, isPretty ? 4 : 0);
        self.postMessage({ jsonString });

    } catch (err) {
        self.postMessage({ error: err.message });
    }
};
