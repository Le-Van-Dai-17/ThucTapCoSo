const { getActorId, safeLogAction } = require('../utils/controllerUtils');
const mlopsService = require('../services/mlopsService');
const notificationService = require('../services/notificationService');

exports.getOverview = async (req, res) => {
  try {
    const data = await mlopsService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error loading MLOps overview:', error);
    res.status(500).json({ success: false, message: 'Loi lay thong tin MLOps' });
  }
};

exports.trainNow = async (req, res) => {
  try {
    const actorId = getActorId(req);
    const result = await mlopsService.trainMonthly({ actorId, triggerType: 'manual', autoDeploy: true });
    await safeLogAction(actorId, 'MLOPS_TRAIN_NOW', `Train model moi. Deployed=${result.deployed}`, 'ml_models', result.candidate_model_id, req.ip);
    await notificationService.safeCreateForRoles(['Admin'], {
      title: 'Model training completed',
      message: `Training completed. Candidate model ID: ${result.candidate_model_id || 'n/a'}, deployed: ${result.deployed ? 'yes' : 'no'}.`,
      type: result.deployed ? 'success' : 'info',
      entityType: 'ml_models',
      entityId: result.candidate_model_id || null,
      link: 'model-performance.html'
    });
    res.status(200).json({ success: true, message: 'Training completed', data: result });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Loi train model' });
  }
};

exports.deployModel = async (req, res) => {
  try {
    const actorId = getActorId(req);
    const modelId = Number(req.params.modelId);
    if (!modelId) return res.status(400).json({ success: false, message: 'modelId khong hop le' });

    const result = await mlopsService.deployModel(modelId, actorId, 'manual deploy from Model Performance');
    await safeLogAction(actorId, 'MLOPS_DEPLOY_MODEL', `Deploy model ID ${modelId}`, 'ml_models', modelId, req.ip);
    await notificationService.safeCreateForRoles(['Admin'], {
      title: 'Model deployed',
      message: `Model ID ${modelId} was deployed successfully.`,
      type: 'success',
      entityType: 'ml_models',
      entityId: modelId,
      link: 'model-performance.html'
    });
    res.status(200).json({ success: true, message: 'Model deployed', data: result });
  } catch (error) {
    console.error('Error deploying model:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Loi deploy model' });
  }
};
