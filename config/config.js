

var config = {
  'dev': {
    'db': 'mongodb://localhost/hr',
    'secret': 'amine'
  },
  'prod': {
    'db': 'mongodb://127.0.0.1/hr',
    'secret': 'amine'
  }
}

module.exports = config[process.env.ENV || 'dev']
