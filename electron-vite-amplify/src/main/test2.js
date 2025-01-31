const { Amplify } = require("aws-amplify");
const { generateClient } = require("aws-amplify/api");
 
// kunci framework-nya
const { WebSocket } = require('ws');
global.WebSocket = WebSocket;
 
const authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9pZCI6IjY1ZDZiYTg4ZGMzM2MyOTFmNWY5YzU3YiIsImxpY2Vuc2UiOiI2NWQ2YmE4YWRjMzNjMjkxZjVmOWM3MGUiLCJuYW1lIjoiZmFuZGkifSwiaWF0IjoxNzMzNzU3NjA3LCJleHAiOjE3NjQ4NjE2MDd9.RQ0DjwNsgtpIRBQCav9LxFe7UPNJNAltL4J_CFBJ7fQ";
Amplify.configure(
  {
    API: {
      GraphQL: {
        region: "eu-central-1",
        endpoint: "https://dyewzulquzabraucc4urj7yv24.appsync-api.eu-central-1.amazonaws.com/graphql",
        // defaultAuthMode: 'lambda'
 
        // endpoint: "https://uwxwtxbufrg5xdhlccqvdl7fze.appsync-api.eu-central-1.amazonaws.com/graphql",
        // defaultAuthMode: 'apiKey',
        // apiKey: "da2-tq2f72s5bvc4bf4u3teusys6aa"
      }
    }
  },
  // {
  //   API: {
  //     GraphQL: {
  //       headers() {
  //         return {
  //           "Authorization": authToken
  //         };
  //       }
  //     }
  //   }
  // }
);
 
const normalClient = generateClient({
  authMode: 'lambda',
  authToken
});
 
const normalPullTodo = async () => {
  // const data = await normalClient.graphql({
  //   query: `
  //     query PullTodo {
  //       pullTodo {
  //         context
  //         isDone
  //       }
  //     }
  //   `,
  //   variables: {}
  // });
 
  const data = await normalClient.graphql({
    query: `
      query GetTodo {
        pullTodo(limit: 10) {
          documents {
            id
            name
            done
            timestamp
            deleted
          }
          checkpoint {
            id
            updatedAt
          }
        }
      }
 
    `,
    variables: {},
    // authMode: "lambda",
    // authToken: authToken
  });
 
  // console.log(JSON.stringify(data, null, 4), " >>>>>>>>>> after GetTodo");
  console.log(data.data.pullTodo.documents[0].name, " >>>>>>>>>> after GetTodo");
  return data;
};
 
const normalPushTodo = async (params) => {
  // const data = await normalClient.graphql({
  //   query: `
  //     mutation PushTodo($context: String!, $isDone: Boolean!) {
  //         pushTodo(context: $context, isDone: $isDone) {
  //             context
  //             isDone
  //         }
  //     }
  //   `,
  //   variables: {
  //     context: `test-${new Date().getTime()}`, // Add timestamp to make it unique
  //     isDone: false
  //   }
  // });
 
  const data = await normalClient.graphql({
    query: `
      mutation PushTodo($row: [TodoInputPushRow!]!) {
          pushTodo(rows: $row) {
            documents {
              id
              name
              done
              timestamp
              deleted
            }
            checkpoint {
              id
              updatedAt
            }
            conflicts {
                id
                name
                done
                timestamp
                deleted
            }
          }
      }
    `,
    variables: {
      row: [
        {
          assumedMasterState: params,
          newDocumentState: {
            ...params,
            name: `test-${Math.floor(Math.random() * 1000)}`,
          }
        }
      ],
    },
    // authMode: "lambda",
    // authToken: authToken
  });
  // console.log(JSON.stringify(data, null, 4), " >>>>>>>>>> after pushTodo");
  console.log(data.data.pushTodo.documents[0].name, " >>>>>>>>>> after pushTodo");
  return data;
};
 
const subscribeToTodos = () => {
  console.log('Initializing subscription...');
 
  const subscription = normalClient.graphql({
    // query: `
    //   subscription SubsTodo {
    //     subsTodo {
    //       context
    //       isDone
    //     }
    //   }
    // `,
    query: `
      subscription StreamTodo {
          streamTodo {
              documents {
                  id
                  name
                  done
                  timestamp
                  deleted
              }
              checkpoint {
                  id
                  updatedAt
              }
          }
      }
    `,
    // authMode: "lambda",
    // authToken: authToken
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
 
  // Add connection state logging
  if (subscription.closed) {
    console.log('Subscription is closed');
  } else {
    console.log('Subscription is open');
  }
 
  return subscription;
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
 
    console.log('Fetching current todos...');
    const data = await normalPullTodo();
    console.log(data.data.pullTodo.documents[0]);
    console.log('Creating new todo...');
    await normalPushTodo(data.data.pullTodo.documents[0]);
 
    console.log('Fetching todo after update...');
    await normalPullTodo();
 
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
  process.exit();
  // Optional: Keep the process running
  // setTimeout(() => process.exit(0), 10000);
});