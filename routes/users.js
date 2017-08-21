var express = require('express');
var router = express.Router();
var userCtrl = require('../controller/userController');
var multer = require('multer');

var upload = multer({ dest: `csv` })

/* GET users listing. */
router.post('/users', userCtrl.create);
router.post('/login', userCtrl.login);

router.post('/users/csv', upload.single('csv'), userCtrl.uploadCSV);
router.get('/employees', userCtrl.getEmployees);
router.post('/employees', userCtrl.createEmployee);
router.put('/employees/:id', userCtrl.updateEmployee);
router.delete('/employees/:id', userCtrl.deleteEmployee);

module.exports = router;
