const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { pool } = require('../db');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const ML_DIR = path.join(__dirname, '../../ml');
const TRAIN_SCRIPT = path.join(ML_DIR, 'train_monthly.py');
const ACTIVE_MODEL_PATH = path.join(ML_DIR, 'models', 'forecast_pipeline.pkl');
const IMPROVEMENT_THRESHOLD_PERCENT = 5;

let schemaReady = false;

async function ensureMlopsSchema() {
  if (schemaReady) return;

  const [mapeColumns] = await pool.query("SHOW COLUMNS FROM model_metrics LIKE 'mape_score'");
  if (mapeColumns.length === 0) {
    await pool.query('ALTER TABLE model_metrics ADD COLUMN mape_score FLOAT NULL AFTER metric_id');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS model_training_runs (
      run_id INT PRIMARY KEY AUTO_INCREMENT,
      candidate_model_id INT NULL,
      baseline_model_id INT NULL,
      run_status ENUM('Running', 'Completed', 'Failed') DEFAULT 'Running',
      trigger_type VARCHAR(50) DEFAULT 'manual',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      train_data_start DATE NULL,
      train_data_end DATE NULL,
      validation_period DATE NULL,
      training_rows INT DEFAULT 0,
      validation_rows INT DEFAULT 0,
      baseline_mape FLOAT NULL,
      candidate_mape FLOAT NULL,
      improvement_percent FLOAT NULL,
      deployed BOOLEAN DEFAULT FALSE,
      deploy_reason VARCHAR(255),
      error_message TEXT,
      created_by INT NULL,
      CONSTRAINT fk_training_runs_candidate_model FOREIGN KEY (candidate_model_id) REFERENCES ml_models(model_id) ON DELETE SET NULL,
      CONSTRAINT fk_training_runs_baseline_model FOREIGN KEY (baseline_model_id) REFERENCES ml_models(model_id) ON DELETE SET NULL,
      CONSTRAINT fk_training_runs_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
    )
  `);

  schemaReady = true;
}

async function getActiveModel(connection = pool) {
  const [rows] = await connection.query(`
    SELECT
      m.model_id,
      m.version_tag,
      m.model_path,
      m.algorithm_type,
      m.training_date,
      m.is_deployed,
      mm.mape_score,
      mm.mae_score,
      mm.rmse_score,
      mm.r2_score,
      mm.test_data_range
    FROM ml_models m
    LEFT JOIN model_metrics mm ON mm.model_id = m.model_id
    WHERE m.is_deployed = 1
    ORDER BY m.training_date DESC, m.model_id DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

async function getModelHistory() {
  await ensureMlopsSchema();
  const [rows] = await pool.query(`
    SELECT
      m.model_id,
      m.version_tag,
      m.model_path,
      m.algorithm_type,
      m.training_date,
      m.is_deployed,
      mm.mape_score,
      mm.mae_score,
      mm.rmse_score,
      mm.r2_score,
      mm.test_data_range
    FROM ml_models m
    LEFT JOIN model_metrics mm ON mm.model_id = m.model_id
    ORDER BY m.training_date DESC, m.model_id DESC
  `);
  return rows;
}

async function getTrainingRuns() {
  await ensureMlopsSchema();
  const [rows] = await pool.query(`
    SELECT
      r.*,
      candidate.version_tag AS candidate_version_tag,
      baseline.version_tag AS baseline_version_tag,
      creator.full_name AS created_by_name
    FROM model_training_runs r
    LEFT JOIN ml_models candidate ON candidate.model_id = r.candidate_model_id
    LEFT JOIN ml_models baseline ON baseline.model_id = r.baseline_model_id
    LEFT JOIN users creator ON creator.user_id = r.created_by
    ORDER BY r.started_at DESC, r.run_id DESC
    LIMIT 100
  `);
  return rows;
}

async function getSalesHistory(connection) {
  const [rows] = await connection.query(`
    SELECT
      p.sku AS product_code,
      DATE_FORMAT(st.transaction_date, '%Y-%m') AS month_key,
      SUM(sd.quantity) AS quantity
    FROM sale_details sd
    INNER JOIN sales_transactions st ON st.transaction_id = sd.transaction_id
    INNER JOIN products p ON p.product_id = sd.product_id
    GROUP BY p.sku, month_key
    ORDER BY month_key ASC, p.sku ASC
  `);

  return rows.map(row => ({
    product_code: String(row.product_code),
    month_key: String(row.month_key),
    quantity: Number(row.quantity || 0),
  }));
}

function runPythonTraining(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [TRAIN_SCRIPT], { cwd: path.join(__dirname, '../..') });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', error => reject(new Error(`Cannot start Python training: ${error.message}`)));
    child.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`Python training failed. Code=${code}. Stderr=${stderr}. Stdout=${stdout}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) return reject(new Error(result.message || 'Python training returned failure'));
        resolve(result);
      } catch (error) {
        reject(new Error(`Cannot parse Python training JSON: ${error.message}. Stdout=${stdout}. Stderr=${stderr}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function calculateImprovementPercent(baselineMape, candidateMape) {
  const baseline = Number(baselineMape);
  const candidate = Number(candidateMape);
  if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(candidate)) return null;
  return ((baseline - candidate) / baseline) * 100;
}

async function resolveModelPath(modelPath) {
  if (path.isAbsolute(modelPath)) return modelPath;

  const candidates = [
    path.join(ML_DIR, modelPath),
    path.join(__dirname, '../..', modelPath),
    path.join(__dirname, '../../..', modelPath)
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  return candidates[0];
}

async function copyModelToActive(modelPath) {
  const source = await resolveModelPath(modelPath);
  await fs.mkdir(path.dirname(ACTIVE_MODEL_PATH), { recursive: true });
  await fs.copyFile(source, ACTIVE_MODEL_PATH);
}

async function deployModel(modelId, actorId = null, reason = 'manual') {
  await ensureMlopsSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [models] = await connection.query('SELECT * FROM ml_models WHERE model_id = ? LIMIT 1', [modelId]);
    if (models.length === 0) {
      const error = new Error('Model not found');
      error.statusCode = 404;
      throw error;
    }

    await copyModelToActive(models[0].model_path);
    await connection.query('UPDATE ml_models SET is_deployed = 0');
    await connection.query('UPDATE ml_models SET is_deployed = 1 WHERE model_id = ?', [modelId]);
    await connection.query(
      `UPDATE model_training_runs SET deployed = 1, deploy_reason = ? WHERE candidate_model_id = ?`,
      [reason, modelId]
    );
    await connection.commit();
    return { model_id: modelId, deployed: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function trainMonthly({ actorId = null, triggerType = 'manual', autoDeploy = true } = {}) {
  await ensureMlopsSchema();
  const connection = await pool.getConnection();
  let runId = null;

  try {
    const baseline = await getActiveModel(connection);
    const [runResult] = await connection.query(
      `INSERT INTO model_training_runs (baseline_model_id, run_status, trigger_type, created_by) VALUES (?, 'Running', ?, ?)`,
      [baseline?.model_id || null, triggerType, actorId]
    );
    runId = runResult.insertId;

    const salesHistory = await getSalesHistory(connection);
    const versionTag = `model_v${Date.now()}`;
    const trainResult = await runPythonTraining({ sales_history: salesHistory, version_tag: versionTag });
    const candidateMape = trainResult.metrics?.mape_score;
    const baselineMape = baseline?.mape_score;
    const improvementPercent = calculateImprovementPercent(baselineMape, candidateMape);
    const shouldDeploy = autoDeploy && (
      baselineMape === null || baselineMape === undefined || improvementPercent === null || improvementPercent >= IMPROVEMENT_THRESHOLD_PERCENT
    );

    await connection.beginTransaction();
    const [modelResult] = await connection.query(
      `INSERT INTO ml_models (version_tag, model_path, algorithm_type, hyperparameters, is_deployed, created_by)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [
        trainResult.version_tag,
        trainResult.model_path,
        trainResult.algorithm_type,
        JSON.stringify({
          features: trainResult.feature_columns,
          train_data_range: trainResult.train_data_range,
          validation_period: trainResult.validation_period,
          policy: 'full-history retrain; deploy if MAPE improves >= 5%'
        }),
        actorId
      ]
    );
    const candidateModelId = modelResult.insertId;

    await connection.query(
      `INSERT INTO model_metrics (model_id, mape_score, mae_score, rmse_score, r2_score, test_data_range)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        candidateModelId,
        candidateMape,
        trainResult.metrics?.mae_score,
        trainResult.metrics?.rmse_score,
        trainResult.metrics?.r2_score,
        trainResult.validation_period
      ]
    );

    await connection.query(
      `UPDATE model_training_runs
       SET candidate_model_id = ?, run_status = 'Completed', finished_at = CURRENT_TIMESTAMP,
           train_data_start = ?, train_data_end = ?, validation_period = ?, training_rows = ?, validation_rows = ?,
           baseline_mape = ?, candidate_mape = ?, improvement_percent = ?, deployed = 0,
           deploy_reason = ?
       WHERE run_id = ?`,
      [
        candidateModelId,
        `${trainResult.train_data_range.start}-01`,
        `${trainResult.train_data_range.end}-01`,
        `${trainResult.validation_period}-01`,
        trainResult.training_rows,
        trainResult.validation_rows,
        baselineMape,
        candidateMape,
        improvementPercent,
        shouldDeploy ? 'auto-deploy pending copy' : 'not improved enough',
        runId
      ]
    );

    await connection.commit();

    if (shouldDeploy) {
      await deployModel(candidateModelId, actorId, improvementPercent === null ? 'auto-deploy: no comparable baseline' : `auto-deploy: MAPE improved ${improvementPercent.toFixed(2)}%`);
    }

    return {
      run_id: runId,
      candidate_model_id: candidateModelId,
      baseline_model_id: baseline?.model_id || null,
      baseline_mape: baselineMape ?? null,
      candidate_mape: candidateMape ?? null,
      improvement_percent: improvementPercent,
      deployed: shouldDeploy,
      threshold_percent: IMPROVEMENT_THRESHOLD_PERCENT,
      train_result: trainResult
    };
  } catch (error) {
    if (runId) {
      await pool.query(
        `UPDATE model_training_runs SET run_status = 'Failed', finished_at = CURRENT_TIMESTAMP, error_message = ? WHERE run_id = ?`,
        [error.message, runId]
      ).catch(() => {});
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function getOverview() {
  await ensureMlopsSchema();
  const [activeModel, models, runs] = await Promise.all([
    getActiveModel(),
    getModelHistory(),
    getTrainingRuns()
  ]);

  return { active_model: activeModel, models, training_runs: runs };
}

module.exports = {
  ensureMlopsSchema,
  getOverview,
  getActiveModel,
  getModelHistory,
  getTrainingRuns,
  trainMonthly,
  deployModel,
};
