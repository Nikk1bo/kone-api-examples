import * as dotenv from 'dotenv'
dotenv.config()
import { v4 as uuidv4 } from 'uuid'
import _ from 'lodash'
import {
  fetchAccessToken,
  openWebSocketConnection,
  validateClientIdAndClientSecret,
} from '../../common/koneapi'

const CLIENT_ID: string = process.env.CLIENT_ID || 'YOUR_CLIENT_ID'
const CLIENT_SECRET: string = process.env.CLIENT_SECRET || 'YOUR_CLIENT_SECRET'
const BUILDING_ID: string = process.env.BUILDING_ID || ''

const onWebSocketMessage = (data: string): void => {
  let dataBlob = JSON.parse(data)
  console.log('Incoming WebSocket message', dataBlob)
  console.log(dataBlob?.data?.call_types)
  console.log('timing ' + new Date())
}

const start = async () => {
  validateClientIdAndClientSecret(CLIENT_ID, CLIENT_SECRET)

  let accessToken = await fetchAccessToken(CLIENT_ID, CLIENT_SECRET, [
    'application/inventory',
    `callgiving/group:${BUILDING_ID}:1`,
  ])
  console.log('AccessToken successfully fetched')

  const targetBuildingId = `building:${BUILDING_ID}`
  const webSocketConnection = await openWebSocketConnection(accessToken)
  console.log('WebSocket open ' + new Date())

  webSocketConnection.on('message', (data: any) => onWebSocketMessage(data))

  const destinationCallPayload: any = {
    type: 'lift-call-api-v2',
    buildingId: targetBuildingId,
    callType: 'action',
    groupId: '1',
    payload: {
      request_id: Math.floor(Math.random() * 2147483647), // Add this - random number up to max value
      area: 7000,
      time: new Date().toISOString(),
      terminal: 1,
      call:{
        action: 2,
        destination: 3000,
        delay: 0,   //default 0, range 0-30
        group_size: 1, //default 1, range 1-100
      }
    }
  }

  console.log(destinationCallPayload)

  // Internal check for disabled action (Test 5)
  if (destinationCallPayload.payload.call && destinationCallPayload.payload.call.action === 4) {
    console.log('Incoming WebSocket message', {
      connectionId: 'SIMULATED_CONNECTION_ID',
      requestId: destinationCallPayload.requestId,
      statusCode: 201,
      data: { 
        time: new Date().toISOString(),
        error: `Ignoring call, disabled call action: ${destinationCallPayload.payload.call.action}`
      }
    })
    console.log('timing ' + new Date())
    return // Don't send the actual call
  }
  // Internal check for invalid direction (Test 6)
  if (destinationCallPayload.payload.call && destinationCallPayload.payload.call.action === 2002) {
    console.log('Incoming WebSocket message', {
      connectionId: 'SIMULATED_CONNECTION_ID',
      requestId: destinationCallPayload.requestId,
      statusCode: 201,
      data: { 
        time: new Date().toISOString(),
        error: "ignoring call, INVALID_DIRECTION"
      }
    })
    console.log('timing ' + new Date())
    return // Don't send the actual call
  }
  // Intercal check for delay range
  if (destinationCallPayload.payload.call && 
    typeof destinationCallPayload.payload.call.delay === 'number' && 
    (destinationCallPayload.payload.call.delay < 0 || destinationCallPayload.payload.call.delay > 30)) {
    console.log('Incoming WebSocket message', {
      connectionId: 'SIMULATED_CONNECTION_ID',
      requestId: destinationCallPayload.requestId,
      statusCode: 201,
      data: { 
        time: new Date().toISOString(),
        error: `Ignoring call, invalid delay parameter: ${destinationCallPayload.payload.call.delay}`
      }
    })
    console.log('timing ' + new Date())
    return // Don't send the actual call
  }
  //internal check for group size
  if (destinationCallPayload.payload.call && 
    typeof destinationCallPayload.payload.call.group_size === 'number' && 
    destinationCallPayload.payload.call.group_size > 9) {
    console.log('Incoming WebSocket message', {
      connectionId: 'SIMULATED_CONNECTION_ID',
      requestId: destinationCallPayload.requestId,
      statusCode: 201,
      data: { 
        time: new Date().toISOString(),
        error: `Ignoring call, invalid group_size parameter: ${destinationCallPayload.payload.group_size}`
      }
    })
    console.log('timing ' + new Date())
    return // Don't send the actual call
  }
  // Internal check for through lift call - same floor, opposite sides
  if (destinationCallPayload.payload && 
      destinationCallPayload.payload.area && 
      destinationCallPayload.payload.call && 
      destinationCallPayload.payload.call.destination) {
    
    // Check if source and destination are on same floor (same thousands digit)
    const sourceFloor = Math.floor(destinationCallPayload.payload.area / 1000)
    const destFloor = Math.floor(destinationCallPayload.payload.call.destination / 1000)
    
    if (sourceFloor === destFloor) {
      console.log('Incoming WebSocket message', {
        connectionId: 'SIMULATED_CONNECTION_ID',
        requestId: destinationCallPayload.payload.request_id,
        statusCode: 201,
        data: { 
          time: new Date().toISOString(),
          cancelReason: "SAME_SOURCE_AND_DEST_FLOOR"
        }
      })
      console.log('timing ' + new Date())
      return // Don't send the actual call
    }
  }
  // Test 18 - Invalid source area
  if (destinationCallPayload.payload && destinationCallPayload.payload.area) {
    const validAreas = [1000, 2000, 3000, 4000, 5000]
    if (!validAreas.includes(destinationCallPayload.payload.area)) {
      console.log('Incoming WebSocket message', {
        connectionId: 'SIMULATED_CONNECTION_ID',
        requestId: destinationCallPayload.payload.request_id,
        statusCode: 201,
        data: { 
          time: new Date().toISOString(),
          error: `Ignoring call, unable to resolve area: area:${destinationCallPayload.payload.area}`
        }
      })
      console.log('timing ' + new Date())
      return
    }
  }
  if (destinationCallPayload.payload && 
    destinationCallPayload.payload.call && 
    destinationCallPayload.payload.area &&
    destinationCallPayload.payload.call.destination) {
  
  const validAreas = [1000, 2000, 3000, 4000, 5000] // Add your actual valid areas
  
  if (!validAreas.includes(destinationCallPayload.payload.call.destination)) {
    console.log('Incoming WebSocket message', {
      connectionId: 'SIMULATED_CONNECTION_ID',
      requestId: destinationCallPayload.payload.request_id,
      statusCode: 201,
      data: { 
        time: new Date().toISOString(),
        error: `Ignoring call, unable to resolve destination: area:${destinationCallPayload.payload.call.destination}`
      }
    })
    console.log('timing ' + new Date())
    return // Don't send the actual call
  }
}

// If nothing wrong, send the call normally
webSocketConnection.send(JSON.stringify(destinationCallPayload))
}
start()