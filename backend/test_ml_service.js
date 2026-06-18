const { predictDemandSingle, predictDemandBatch } = require('./src/services/mlForecastService');

async function testSingle() {
    const result = await predictDemandSingle({
        product_code: 'FOODS_1_001',
        lag_1: 20,
        lag_2: 18,
        lag_3: 25,
        target_month: 6
    });

    console.log('Single prediction:', result);
}

async function testBatch() {
    const results = await predictDemandBatch([
        {
            product_code: 'FOODS_1_001',
            lag_1: 20,
            lag_2: 18,
            lag_3: 25,
            target_month: 6
        },
        {
            product_code: 'FOODS_1_002',
            lag_1: 10,
            lag_2: 12,
            lag_3: 9,
            target_month: 6
        }
    ]);

    console.log('Batch predictions:', results);
}

async function main() {
    try {
        await testSingle();
        await testBatch();
    } catch (error) {
        console.error('Test ML service failed:', error.message);
    }
}

main();