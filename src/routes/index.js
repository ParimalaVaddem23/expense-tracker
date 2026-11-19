'use strict';
const express = require('express');

const router = express.Router();
router.use('/expenses', require('./expenses').router);
router.use('/summary', require('./summary'));
router.use('/health', require('./health'));
router.use('/test-data', require('./testData'));

module.exports = router;
