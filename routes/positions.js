var express = require('express');
var router = express.Router();
var positionCtrl = require('../controller/positionController');


/* GET users listing. */
router.get('/', positionCtrl.list);
router.get('/:id', positionCtrl.get);
router.delete('/:id', positionCtrl.delete);

module.exports = router;
