import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
// import { Amplify } from '@aws-amplify/core';
// import { Auth } from '@aws-amplify/auth';
// import { API } from '@aws-amplify/api';
// import awsExports from './src/aws-exports'; // Adjust the path if necessary
// import outputs from '../../amplify_outputs.json';
// Amplify.configure(outputs);
const { WebSocket } = require('ws');
global.WebSocket = WebSocket;
const { Amplify } = require("aws-amplify");
const { generateClient } = require("aws-amplify/api");

import initRXDB from './rxdb/rxdbController';
// Amplify.configure({
//   API: {
//     GraphQL: {
//       endpoint: "https://uwxwtxbufrg5xdhlccqvdl7fze.appsync-api.eu-central-1.amazonaws.com/graphql",
//       region: "eu-central-1",
//       defaultAuthMode: 'apiKey',
//       apiKey: "da2-tq2f72s5bvc4bf4u3teusys6aa"
//     }
//   }
// });
// const normalClient = generateClient();


// Amplify.configure({
//   API: {
//     GraphQL: {
//       endpoint: 'https://dyewzulquzabraucc4urj7yv24.appsync-api.eu-central-1.amazonaws.com/graphql',
//       region: 'eu-central-1',
//       defaultAuthMode: 'lambda',
//     }
//   }
// });

// const authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9pZCI6IjY1ZDZiYTg4ZGMzM2MyOTFmNWY5YzU3YiIsImxpY2Vuc2UiOiI2NWQ2YmE4YWRjMzNjMjkxZjVmOWM3MGUiLCJuYW1lIjoiZmFuZGkifSwiaWF0IjoxNzMzNzU3NjA3LCJleHAiOjE3NjQ4NjE2MDd9.RQ0DjwNsgtpIRBQCav9LxFe7UPNJNAltL4J_CFBJ7fQ";
// Amplify.configure(
//   {
//     API: {
//       GraphQL: {
//         region: "eu-central-1",
//         endpoint: "https://dyewzulquzabraucc4urj7yv24.appsync-api.eu-central-1.amazonaws.com/graphql",
//       }
//     }
//   },
// );
// const normalClient = generateClient({
//   authMode: 'lambda',
//   authToken
// });

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
  if (!params) {
    params = {
      id: 'electron-'+Date.now(),
      name: 'electron-'+Date.now(),
      done: false,
      timestamp: Date.now(),
      deleted: false
    };
  }
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

// const subscribeToTodos = () => {
//   console.log('Initializing subscription...');

//   return normalClient.graphql({
//     query: `
//       subscription SubsTodo {
//         subsTodo {
//           context
//           isDone
//         }
//       }
//     `
//   }).subscribe({
//     next: (data) => {
//       console.log('Subscription data received:', JSON.stringify(data, null, 2));
//     },
//     error: (error) => {
//       console.error('Subscription error:', error);
//     },
//     complete: () => {
//       console.log('Subscription completed');
//     }
//   });
// };

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


function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then( async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // await subscribeToTodos()
  global.database = await initRXDB()
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', async () => {
      // Get current todos
      console.log('Fetching current todos...');
      const listData = await database.todos.find();
      console.log(listData);
      // await normalPullTodo();
  })

  ipcMain.on('push', async () => {
    // Get current todos
    console.log('push current todos...');
    await database.todos.insert({
      id: Date.now().toString(),
      name: "electron_"+Date.now(),
      done: false, // Randomly set as true or false
      timestamp: Date.now(),
      deleted: false,
    });
    // await normalPushTodo();
})

  createWindow()


  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
