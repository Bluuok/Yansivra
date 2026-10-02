// Bound hidden-window protocol calls so a compositor stall cannot hang acceptance.
export async function bounded(operation, label, milliseconds = 15000) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function boundedCDP(session) {
  return { send: (method, parameters) => bounded(session.send(method, parameters), method) };
}
