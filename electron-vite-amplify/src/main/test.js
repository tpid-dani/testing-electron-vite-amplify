const { Amplify } = require("aws-amplify");
const { generateClient } = require("aws-amplify/api");

Amplify.configure({
  API: {
    GraphQL: {
      endpoint: "https://uwxwtxbufrg5xdhlccqvdl7fze.appsync-api.eu-central-1.amazonaws.com/graphql",
      region: "eu-central-1",
      defaultAuthMode: 'apiKey',
      apiKey: "da2-tq2f72s5bvc4bf4u3teusys6aa"
    }
  }
});

const normalClient = generateClient();

const normalPullTodo = async () => {
  const data = await normalClient.graphql({
    query: `
      query PullTodo {
        pullTodo {
          context
          isDone
        }
      }
    `,
    variables: {}
  });

  console.log(JSON.stringify(data, null, 4), " >>>>>>>>>> after GetTodo");
  return data;
};

const normalPushTodo = async () => {
  const data = await normalClient.graphql({
    query: `
      mutation PushTodo($context: String!, $isDone: Boolean!) {
          pushTodo(context: $context, isDone: $isDone) {
              context
              isDone
          }
      }
    `,
    variables: {
      context: `test-${new Date().getTime()}`, // Add timestamp to make it unique
      isDone: false
    }
  });

  console.log(JSON.stringify(data, null, 4), " >>>>>>>>>> after pushTodo");
  return data;
};

const subscribeToTodos = () => {
  console.log('Initializing subscription...');

  return normalClient.graphql({
    query: `
      subscription SubsTodo {
        subsTodo {
          context
          isDone
        }
      }
    `
  }).subscribe({
    next: (data) => {
      console.log('Subscription data received:', JSON.stringify(data, null, 2));
    },
    error: (error) => {
      console.error('Subscription error:', error);
    },
    complete: () => {
      console.log('Subscription completed');
    }
  });
};

// Test sequence
async function testSequence() {
  try {
    console.log('Starting test sequence...');

    // Set up subscription
    const subscription = subscribeToTodos();
    console.log('Subscription initialized');

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('Subscription should be ready');

    // Get current todos
    console.log('Fetching current todos...');
    await normalPullTodo();

    // Push new todo
    console.log('Creating new todo...');
    // await normalPushTodo();

    // Keep the process alive to receive subscription updates
    console.log('Waiting for subscription updates...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Cleanup
    console.log('Cleaning up...');
    subscription.unsubscribe();
    console.log('Test sequence completed');

  } catch (error) {
    console.error('Error in test sequence:', error);
  }
}

// Run the test
testSequence().then(() => {
  console.log('Test completed');
  // Optional: Keep the process running
  // setTimeout(() => process.exit(0), 10000);
});