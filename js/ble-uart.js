// ble-uart.js
const UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class MicrobitUart {
  constructor({ onLog = () => {}, onRx = () => {}, onConnectionChange = () => {} } = {}) {
    this.onLog = onLog;
    this.onRx = onRx;
    this.onConnectionChange = onConnectionChange;
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
  }

  get connected() {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.writeChar);
  }

  async connect() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE],
    });

    this.device.addEventListener("gattserverdisconnected", () => {
      this._clear();
      this.onConnectionChange(false);
    });

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(UART_SERVICE);
    const chars = await service.getCharacteristics();

    this.writeChar =
      chars.find((c) => c.properties.writeWithoutResponse) ||
      chars.find((c) => c.properties.write);

    this.notifyChar = chars.find((c) => c.properties.notify);

    if (this.notifyChar) {
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener("characteristicvaluechanged", (e) => {
        const text = new TextDecoder().decode(e.target.value).trim();
        this.onRx(text);
      });
    }

    this.onConnectionChange(true);
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this._clear();
    this.onConnectionChange(false);
  }

  async sendLine(line) {
    const msg = line.endsWith("\n") ? line : line + "\n";
    const data = new TextEncoder().encode(msg);
    for (let i = 0; i < data.length; i += 20) {
      await this.writeChar.writeValueWithoutResponse(data.slice(i, i + 20));
      await sleep(15);
    }
  }

  _clear() {
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
  }
}
