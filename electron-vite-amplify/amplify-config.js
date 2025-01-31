const Amplify = require('@aws-amplify/core').Amplify;
const Auth = require('@aws-amplify/auth').Auth;
const API = require('@aws-amplify/api').API;

Amplify.configure({
  Auth: {
    region: 'us-east-1',  // Replace with your AWS region
    userPoolId: 'us-east-1_XXXXXX',  // Your Cognito User Pool ID
    userPoolWebClientId: 'XXXXXX',   // Your App Client ID
  },
  API: {
    endpoints: [
      {
        name: 'myAPI',
        endpoint: 'https://your-api-id.execute-api.region.amazonaws.com',
      },
    ],
  },
});

module.exports = { Auth, API };
