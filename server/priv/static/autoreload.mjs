const initialDelay = 500;
const longDelay = 5000;
const fastRetryDuration = 5000;
const SERVER_DOWN_TIME_KEY = "lastServerDowntimeMs";

let liveReloadWebSocket = null;
let reconnectTimeout = null;
let disconnectTime = null;

// TODO: maybe put this on a separate dev server
// and notify it on main-server restarts
function connect() {
  clearTimeout(reconnectTimeout);

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  liveReloadWebSocket = new WebSocket(
    // TODO: get routes from server
    `${protocol}://${window.location.host}/ws`,
  );

  liveReloadWebSocket.onopen = () => {
    if (disconnectTime) {
      const downtime = Date.now() - disconnectTime;
      sessionStorage.setItem(SERVER_DOWN_TIME_KEY, downtime);
      disconnectTime = null;
      window.location.reload();
    }
  };

  liveReloadWebSocket.onclose = () => {
    if (!disconnectTime) {
      disconnectTime = Date.now();
    }
    const downtime = Date.now() - disconnectTime;
    const nextDelay = downtime < fastRetryDuration ? initialDelay : longDelay;

    console.log(`WebSocket connection closed. Retrying in ${nextDelay / 1000}s...`);
    reconnectTimeout = setTimeout(connect, nextDelay);
  };
}

connect();
