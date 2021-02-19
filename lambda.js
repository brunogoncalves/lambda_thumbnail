const app = require('./app/app');
const saeAwsLambdaFunction = require('sae-aws-lambda');

// Executar o boot da aplicação
app.boot();

// Registrar comandos
require('./app/commands')(app);

// Register routes
//require('./app/routes')(app);

exports.handler = saeAwsLambdaFunction(app);