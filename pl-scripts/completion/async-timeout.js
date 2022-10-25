class TimeoutError extends Error {}

// Throw an error if a Promise doesn't resolve within the timeLimit
async function asyncTimeout(promise, timeLimit) {
  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      clearTimeout(timeout);
      resolve(new TimeoutError(`Execution timed out after ${timeLimit}ms.`));
    }, timeLimit);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  return result;
}

module.exports = {
  asyncTimeout,
  TimeoutError,
};
