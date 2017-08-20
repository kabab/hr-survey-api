var express = require('express');
var router = express.Router();
var teamCtrl = require('../controller/teamController');


/* GET users listing. */
router.get('/', teamCtrl.list);
router.get('/:id', teamCtrl.get);
router.delete('/:id', teamCtrl.delete);

module.exports = router;
