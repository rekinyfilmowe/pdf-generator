// utils/queue.js
const queue = [];
let isProcessing = false;

async function addToQueue(taskFn) {
  return new Promise((resolve, reject) => {
    queue.push({ taskFn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const { taskFn, resolve, reject } = queue.shift();

  try {
    const result = await taskFn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    isProcessing = false;
    setTimeout(processQueue, 0); // rusz z kolejnym
  }
}

module.exports = { addToQueue };
