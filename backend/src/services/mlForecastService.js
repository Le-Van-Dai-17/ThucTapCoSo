const path = require('path');
const { spawn } = require('child_process');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';

const PYTHON_SCRIPT_PATH = path.join(
    __dirname,
    '../../ml/predict_forecast.py'
);

/**
 * Gọi Python model để dự báo nhiều sản phẩm cùng lúc.
 *
 * Input:
 * [
 *   {
 *     product_code: "FOODS_1_001",
 *     lag_1: 20,
 *     lag_2: 18,
 *     lag_3: 25,
 *     target_month: 6
 *   }
 * ]
 *
 * Output:
 * [
 *   {
 *     product_code: "FOODS_1_001",
 *     predicted_quantity: 19
 *   }
 * ]
 */
function predictDemandBatch(items) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(items) || items.length === 0) {
            return reject(new Error('Danh sách items dự báo không hợp lệ.'));
        }

        const pythonProcess = spawn(PYTHON_BIN, [PYTHON_SCRIPT_PATH], {
            cwd: path.join(__dirname, '../..')
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Không chạy được Python process: ${error.message}`));
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(
                    new Error(`Python predict lỗi. Code=${code}. Stderr=${stderr}. Stdout=${stdout}`)
                );
            }

            try {
                const result = JSON.parse(stdout.trim());

                if (!result.success) {
                    return reject(new Error(result.message || 'Python predict thất bại.'));
                }

                resolve(result.predictions || []);
            } catch (error) {
                reject(
                    new Error(
                        `Không parse được JSON từ Python.\nStdout: ${stdout}\nStderr: ${stderr}\nError: ${error.message}`
                    )
                );
            }
        });

        const payload = {
            items: items.map((item) => ({
                product_code: String(item.product_code),
                lag_1: Number(item.lag_1 || 0),
                lag_2: Number(item.lag_2 || 0),
                lag_3: Number(item.lag_3 || 0),
                target_month: Number(item.target_month)
            }))
        };

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();
    });
}

/**
 * Gọi Python model để dự báo 1 sản phẩm.
 */
async function predictDemandSingle(item) {
    const predictions = await predictDemandBatch([item]);
    return predictions[0];
}

module.exports = {
    predictDemandBatch,
    predictDemandSingle
};