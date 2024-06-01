import {Peer} from 'https://esm.sh/peerjs@1.5.2?bundle-deps'

const startPeerId = '7c19ca40-d1df-440e-b47a-ad62d7bbe412'
const finishPeerId = 'cfb76b28-4bb2-434f-b0bc-34dac2c6fa47'
let peer
let connection
let startTime
const times = {}

const initWrapper = 'initWrapper'
const startWrapper = 'startWrapper'
const finishInitWrapper = 'finishInitWrapper'
const finishWrapper = 'finishWrapper'
const finishResultsWrapper = 'finishResultsWrapper'

const wrappers = [initWrapper, startWrapper, finishInitWrapper, finishWrapper, finishResultsWrapper]

const showOnly = (id) => {
  for (const wrapper of wrappers) {
    document.getElementById(wrapper).hidden = wrapper !== id
  }
}

const formatTime = (ms) => {
  const hourInMs = 3_600_000
  const minuteInMs = 60_000
  const secondInMs = 1000
  if (ms >= hourInMs) {
    return `${Math.floor(ms / hourInMs)}:${formatTime(ms % hourInMs)}`
  }
  if (ms >= minuteInMs) {
    return `${Math.floor(ms / minuteInMs)}:${formatTime(ms % minuteInMs)}`
  }
  return `${Math.floor(ms / secondInMs)}.${ms % secondInMs}`
}

const initPeer = (peerId) => {
  peer = new Peer(peerId)
  peer.on('error', (error) => {
    console.log(`PeerJS Error: ${error}`)
  })
}

const start = () => {
  startTime = Date.now()
  if (!connection) {
    throw new Error('connection is not open')
  }
  console.log(`Sending ${startTime} to finishPeer ${finishPeerId}`)
  connection.send(startTime)
}

const isRaceFinished = () => {
  if (!startTime) {
    return false
  }
  for (const el of document.getElementsByClassName('runner')) {
    if (!el.disabled) {
      return false
    }
  }
  return true
}

const showResults = () => {
  console.log(times, 'Race finished')
  document.getElementById(finishResultsWrapper).innerHTML =
    `<pre>${
      Object.entries(times)
        .sort(([_, time]) => time)
        .map(([runner, time], index) => `${index+1}. ${runner} ${formatTime(time)}`)
        .join('\n')
    }</pre>`
  showOnly(finishResultsWrapper)
}

const receivedStartTime = (startTimeReceived) => {
  console.log(`Received startTime ${startTimeReceived}`)
  startTime = startTimeReceived
  for (const el of document.getElementsByClassName('runner')) {
    el.disabled = false
    el.addEventListener('click', (ev) => {
      const time = Date.now() - startTime
      times[el.id] = time
      console.log(`${el.id} finished in ${formatTime(time)}`)
      el.disabled = true
      if (isRaceFinished()) {
        showResults()
      }
    })
  }
}

const createButtons = () => {
  const runners = document.getElementById('runners').value.split(/\s+/).filter(x => x)
  console.log(runners)
  document.getElementById(finishWrapper).innerHTML =
    runners.map((runner) =>
      `<button id="${runner}" class="runner" disabled="disabled">${runner}</button>`).join('\n')
  showOnly(finishWrapper)
  connection = peer.connect(startPeerId)
  connection.on('open', () => {
    console.log(`Sending startPeer ${startPeerId} notification to allow clicking Start button`)
    connection.send('finishReady')
    connection.on('data', receivedStartTime)
  })
}

const iAmStart = () => {
  console.log('I am start')
  showOnly(startWrapper)
  document.getElementById('start').addEventListener('click', () => start())
  initPeer(startPeerId)
  peer.on('connection', (conn) => {
    connection = conn
    conn.on('data', (data) => {
      console.log(`Received ${data}`)
      if (data === 'finishReady') {
        document.getElementById('start').disabled = false
      }
    })
  })

}

const iAmFinish = () => {
  console.log('I am finish')
  showOnly(finishInitWrapper)
  document.getElementById('createButtons').addEventListener('click', () => createButtons())
  document.getElementById('runners').focus()
  initPeer(finishPeerId)
}

window.addEventListener('load', () => {
  document.getElementById('iamstart').addEventListener('click', () => iAmStart())
  document.getElementById('iamfinish').addEventListener('click', () => iAmFinish())
})

