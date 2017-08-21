var express = require('express');
var router = express.Router();
var surveyCtrl = require('../controller/surveyController');
var jwt = require('../service/jwt');
/* GET users listing. */
router.post('/', jwt, surveyCtrl.create);
router.get('/', jwt, surveyCtrl.list);
router.get('/:id', jwt, surveyCtrl.get);
router.put('/:id/stop', jwt, surveyCtrl.stop);
router.get('/:id/users', jwt, surveyCtrl.users);

router.delete('/:id/rules/:rule_id', jwt, surveyCtrl.deleteRule);
router.post('/:id/rules', jwt, surveyCtrl.addRule);

router.post('/:id/rate', jwt, surveyCtrl.rateUser);


router.get('/:id/ratings', jwt, surveyCtrl.getRatings);

router.post('/:id/result', jwt, surveyCtrl.result);

module.exports = router;
