// Runs fn while catching everything it prints, so the test output stays clean
// and tests can check what was logged. The real console is always put back.
export async function captureConsole(fn) {
  const real = { log: console.log, error: console.error };
  const logged = { log: [], error: [] };
  console.log = (...args) => logged.log.push(args.join(" "));
  console.error = (...args) => logged.error.push(args.join(" "));

  try {
    await fn();
  } finally {
    console.log = real.log;
    console.error = real.error;
  }

  return logged;
}
