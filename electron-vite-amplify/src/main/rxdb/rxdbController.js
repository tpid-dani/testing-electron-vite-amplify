import initDatabase from './initDatabase'
import { Subject } from 'rxjs'
// import EventSource from 'eventsource'
import { replicateRxCollection } from 'rxdb/plugins/replication'
import { map } from 'rxjs/operators';

const { WebSocket } = require('ws');
global.WebSocket = WebSocket;
const { Amplify } = require("aws-amplify");
const { generateClient } = require("aws-amplify/api");

async function initRXDB(params) {

    const authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9pZCI6IjY1ZDZiYTg4ZGMzM2MyOTFmNWY5YzU3YiIsImxpY2Vuc2UiOiI2NWQ2YmE4YWRjMzNjMjkxZjVmOWM3MGUiLCJuYW1lIjoiZmFuZGkifSwiaWF0IjoxNzMzNzU3NjA3LCJleHAiOjE3NjQ4NjE2MDd9.RQ0DjwNsgtpIRBQCav9LxFe7UPNJNAltL4J_CFBJ7fQ";
    Amplify.configure(
    {
        API: {
        GraphQL: {
            region: "eu-central-1",
            endpoint: "https://dyewzulquzabraucc4urj7yv24.appsync-api.eu-central-1.amazonaws.com/graphql",
        }
        }
    },
    );
    
    const normalClient = generateClient({
    authMode: 'lambda',
    authToken
    });

    console.log('Initializing subscription...');
    // const subs =  normalClient.graphql({
    //   query: `
    //     subscription StreamTodo {
    //         streamTodo {
    //             documents {
    //                 id
    //                 name
    //                 done
    //                 timestamp
    //                 deleted
    //             }
    //             checkpoint {
    //                 id
    //                 updatedAt
    //             }
    //         }
    //     }
    //   `,
    // }).subscribe({
    //     next: (data) => {
    //       console.log('Subscription data received:', JSON.stringify(data, null, 2));
    //     },
    //     error: (error) => {
    //       console.error('Subscription error:', error);
    //     },
    //     complete: () => {
    //       console.log('Subscription completed');
    //     }
    // });
    const subscription = normalClient.graphql({
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
    });
    global.db = await initDatabase()
    // const token = "IkhTMjU2Ig.eyJleHAiOjE3NjE5ODc5ODYwMDAsImRhdGEiOnsiX2lkIjoiNjYxZGQ5NjUzZmE1ZjljODliY2U0YTllIiwibGljZW5zZSI6IjY2MWRkOTY1M2ZhNWY5Yzg5YmNlNGE5ZiJ9fQ.g40gt8tSz5GEBo39lURuCf+tmceAqlAUkL/Qo3E48Cw"
    const myPullStream$ = new Subject()
    // const eventSource = new EventSource('https://sort.my.id/rxdb/pull_stream', {
    //     // withCredentials: false
    //     headers: {
    //         Authorization: token
    //     },
    // })
    // eventSource.onmessage = (event) => {
    //     const eventData = JSON.parse(event.data)
    //     // Return ini harus sama dengan yang di pull replicate
    //     console.log("subscribe", eventData.documents)
    //     myPullStream$.next({
    //         documents: eventData.documents,
    //         checkpoint: eventData.checkpoint
    //     })
    // }

    // eventSource.onerror = () => myPullStream$.next('RESYNC')

    const syncUrl = 'https://sort.my.id/rxdb'

    // const replicateState = replicateRxCollection({
    //     collection: db.todos,
    //     // replicationIdentifier: 'https://sort.my.id/rxdb',
    //     push: {
    //         /* add settings from below */
    //         async handler(changeRows) {
    //             // console.log(changeRows)
    //             const rawResponse = await fetch(`${syncUrl}`, {
    //                 method: 'POST',
    //                 headers: {
    //                     Accept: 'application/json',
    //                     'Content-Type': 'application/json',
    //                     Authorization: token
    //                 },
    //                 body: JSON.stringify(changeRows)
    //             })
    //             const conflictsArray = await rawResponse.json()
    //             return conflictsArray
    //         }
    //     },
    //     pull: {
    //         /* add settings from below */
    //         async handler(lastCheckpoint, batchSize) {
    //             const minTimestamp = lastCheckpoint ? lastCheckpoint.updatedAt : 0
    //             /**
    //              * In this example we replicate with a remote REST server
    //              */
    //             const response = await fetch(
    //                 `${syncUrl}?minUpdatedAt=${minTimestamp}&limit=${batchSize}`,
    //                 {
    //                     headers: {
    //                         Authorization: token
    //                     }
    //                 }
    //             )
    //             const documentsFromRemote = await response.json()
    //             return {
    //                 /**
    //                  * Contains the pulled documents from the remote.
    //                  * Not that if documentsFromRemote.length < batchSize,
    //                  * then RxDB assumes that there are no more un-replicated documents
    //                  * on the backend, so the replication will switch to 'Event observation' mode.
    //                  */
    //                 documents: documentsFromRemote.documents,
    //                 /**
    //                  * The last checkpoint of the returned documents.
    //                  * On the next call to the pull handler,
    //                  * this checkpoint will be passed as 'lastCheckpoint'
    //                  */
    //                 checkpoint: documentsFromRemote.checkpoint
    //             }
    //         },
    //         stream$: myPullStream$.asObservable()
    //     }
    // })
    const replicateState = replicateRxCollection({
        collection: db.todos,
        push: {
          async handler(changeRows) {
            const [data] = changeRows;
            let assumedMasterState = data.assumedMasterState;
            if (data.assumedMasterState) {
              assumedMasterState = {
                "id": data.assumedMasterState.id,
                "name": data.assumedMasterState.name,
                "done": data.assumedMasterState.done,
                "timestamp": data.assumedMasterState.timestamp,
                "deleted": data.assumedMasterState._deleted
              }
            }
            const newDocumentState = {
              "id": data.newDocumentState.id,
              "name": data.newDocumentState.name,
              "done": data.newDocumentState.done,
              "timestamp": data.newDocumentState.timestamp,
              "deleted": data.newDocumentState._deleted
            }

            console.log("start push", newDocumentState)
            const add = await normalClient.graphql({
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
                    // assumedMasterState: assumedMasterState,
                    assumedMasterState: assumedMasterState,
                    newDocumentState: newDocumentState
                  }
                ],
              },
            });
            // setInput(initialState)
            console.log("end push");
            // return []
            console.log(add);
            return add.data.pushTodo.conflicts;
          }
        },
        pull: {
          async handler(checkpointOrNull, batchSize) {
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
            });
            return  data.data.pullTodo;
          },
          // stream$: myPullStream$.asObservable()
          stream$: subscription.pipe(
            map(data => {
              console.log(data.data.streamTodo);
              return data.data.streamTodo
            })
          )
        },
  
      });

    // replicateState.error$.subscribe((error) => {
    //     console.error('replication error:', error)
    // })
    // console.log(await db.todos.find().exec())
    return {
        todos: {
            find: async (query = {}) => {
                const docs = await db.todos.find(query).exec()
                return docs.map((doc) => doc.toJSON())
            },
            // findOne: async (id) => {
            //     const doc = await db.todos.findOne(id).exec()
            //     return doc ? doc.toJSON() : null
            // },
            insert: async (todo) => {
                // console.log(todo, 'todo----------')
                console.log("todo", todo)
                const doc = await db.todos.insert(todo)
                return doc.toJSON()
            },
            // update: async (id, update) => {
            //     const doc = await db.todos.findOne(id).exec()
            //     if (!doc) throw new Error('Document not found')
            //     await doc.patch(update)
            //     return doc.toJSON()
            // },
            // delete: async (id) => {
            //     const doc = await db.todos.findOne(id).exec()
            //     if (!doc) throw new Error('Document not found')
            //     await doc.remove()
            //     return { success: true }
            // },
            // subscribe: (callback) => {
            //     db.todos.find().$.subscribe((docs) => {
            //         console.log("subscribtion", docs.toJSON())
            //         // This will be triggered on any change to the todos collection
            //         const updatedDocs = docs.map((doc) => doc.toJSON())

            //         // Call the provided callback with the updated data
            //         callback(updatedDocs)
            //     })
            // },
            // cleanUp: async () => {
            //     console.log('cleaning up--------')
            //     await db.todos.cleanup()
            // }
        }
    }
}

export default initRXDB;