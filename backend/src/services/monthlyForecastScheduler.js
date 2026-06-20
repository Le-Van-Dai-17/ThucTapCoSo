const { pool } = require('../db');
const forecastController = require('../controllers/forecastController');
const { safeLogAction } = require('../utils/controllerUtils');
const mlopsService = require('./mlopsService');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const getNextMonthDate = (date = new Date()) => {
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
};

const shouldRunToday = (date = new Date()) => date.getDate() === 1;

const hasForecastForPeriod = async (targetPeriod) => {
    const [rows] = await pool.query(
        'SELECT COUNT(*) AS total FROM demand_forecasts WHERE target_period = ?',
        [targetPeriod]
    );

    return Number(rows[0]?.total || 0) > 0;
};

const runMonthlyTrainingBeforeForecast = async () => {
    try {
        const result = await mlopsService.trainMonthly({
            actorId: null,
            triggerType: 'monthly_scheduler',
            autoDeploy: true
        });
        console.log('[Scheduler] MLOps training completed:', {
            run_id: result.run_id,
            deployed: result.deployed,
            candidate_mape: result.candidate_mape,
            improvement_percent: result.improvement_percent
        });
        return result;
    } catch (error) {
        console.error('[Scheduler] MLOps training failed; forecast will continue with active model:', error.message);
        return { success: false, error: error.message };
    }
};

const runForecastSilently = (targetPeriod) => new Promise((resolve, reject) => {
    const req = {
        body: { target_period: targetPeriod },
        query: {},
        user: null,
        ip: 'system-monthly-scheduler'
    };

    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            if (this.statusCode >= 400 || payload?.success === false) {
                const error = new Error(payload?.message || 'Monthly forecast run failed');
                error.statusCode = this.statusCode;
                error.payload = payload;
                reject(error);
                return;
            }
            resolve(payload);
        }
    };

    Promise.resolve(forecastController.runForecast(req, res)).catch(reject);
});

const runMonthlyForecastIfNeeded = async (date = new Date()) => {
    if (!shouldRunToday(date)) {
        return { skipped: true, reason: 'not-first-day' };
    }

    const targetPeriod = getNextMonthDate(date);
    if (await hasForecastForPeriod(targetPeriod)) {
        return { skipped: true, reason: 'already-exists', target_period: targetPeriod };
    }

    const trainingResult = await runMonthlyTrainingBeforeForecast();
    const result = await runForecastSilently(targetPeriod);
    await safeLogAction(
        null,
        'AUTO_RUN_MONTHLY_FORECAST',
        `He thong tu dong chay du bao dau thang cho ky ${targetPeriod}`,
        'demand_forecasts',
        null,
        'system-monthly-scheduler'
    );

    return { skipped: false, target_period: targetPeriod, training_result: trainingResult, result };
};

const startMonthlyForecastScheduler = () => {
    const execute = async () => {
        try {
            const result = await runMonthlyForecastIfNeeded();
            if (!result.skipped) {
                console.log(`[Scheduler] Monthly forecast completed for ${result.target_period}`);
            }
        } catch (error) {
            console.error('[Scheduler] Monthly forecast failed:', error);
        }
    };

    execute();
    return setInterval(execute, CHECK_INTERVAL_MS);
};

module.exports = {
    startMonthlyForecastScheduler,
    runMonthlyForecastIfNeeded,
    getNextMonthDate
};
