const express = require('express');
const router = express.Router();
const detailsController = require('../controllers/detailsController');

router.get('/:id', detailsController.getDetailsData);

module.exports = router;
