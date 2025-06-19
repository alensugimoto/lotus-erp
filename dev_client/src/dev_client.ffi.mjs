const INITIAL_DELAY = 500;
const LONG_DELAY = 5000;
const FAST_RETRY_DURATION = 5000;
const SERVER_DOWN_TIME_KEY = "lastServerDowntimeMs";

let liveReloadWebSocket = null;
let reconnectTimeout = null;
let disconnectTime = null;

// TODO: maybe put this on a separate dev server
// and notify it on main-server restarts
export const connect = (ws_endpoint) => {
  clearTimeout(reconnectTimeout);

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  liveReloadWebSocket = new WebSocket(
    // TODO: get routes from server
    `${protocol}://${window.location.host}${ws_endpoint}`,
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
    const nextDelay = downtime < FAST_RETRY_DURATION ? INITIAL_DELAY : LONG_DELAY;

    console.log(`WebSocket connection closed. Retrying in ${nextDelay / 1000}s...`);
    reconnectTimeout = setTimeout(() => {
      connect(ws_endpoint)
    }, nextDelay);
  };
};
