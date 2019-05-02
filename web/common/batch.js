const Queue = require('p-queue')
const pRetry = require('p-retry')
const Gauge = require('gauge')

const CONCURRENCY = process.env.CONCURRENCY || 1

function createBatch ({ name, job, isHit = () => true, concurrency = CONCURRENCY, retry = 2 }) {
  return async function batch (inputs) {
    const queue = new Queue({ concurrency })
    const gauge = new Gauge()
  
    let count = 0
    let results = []
  
    queue.on('active', () => {
      gauge.show(`Working on ${name}: #${++count} / ${inputs.length}`, count / inputs.length)
    })
  
    inputs.forEach((input) => queue.add(async () =>
      results.push(await pRetry(() => job(...input), {
        onFailedAttempt (error) {
          console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`)
        },
        retries: retry,
      }))
    ))
  
    await queue.onIdle()
    gauge.hide()
  
    return results.filter(isHit)
  }
}

exports.createBatch = createBatch
