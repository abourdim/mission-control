// =====================================
// micro:bit BLE UART Command Monitor
// - No motor management
// - Logs to USB Serial
// - ACK every BLE received line
// - Shows arrows for direction commands
// =====================================

bluetooth.startUartService()

serial.redirectToUSB()
serial.writeLine("micro:bit BLE UART monitor started")

// --- Connection state + visual feedback ---
let bleConnected = false
let wasEverConnected = false
let lastCmdAt = 0

bluetooth.onBluetoothConnected(function () {
    bleConnected = true
    wasEverConnected = true
    basic.showIcon(IconNames.Yes)        // ✓ tick
    basic.pause(400)
    basic.clearScreen()
    music.playTone(988, 120)             // short high beep (v2)
    serial.writeLine("[BLE] connected")
})

bluetooth.onBluetoothDisconnected(function () {
    bleConnected = false
    serial.writeLine("[BLE] disconnected")

    // Phase 1: hold cross + low beep
    basic.showIcon(IconNames.No)         // ✗ cross
    music.playTone(220, 200)             // low beep (v2)
    basic.pause(600)

    // Phase 2: broken-link blink 3×
    for (let i = 0; i < 3; i++) {
        basic.showLeds(`
            . # . # .
            # . # . #
            . # . # .
            # . # . #
            . # . # .
        `)
        basic.pause(150)
        basic.clearScreen()
        basic.pause(150)
    }
})

// Heartbeat: proves the micro:bit is alive + shows link state.
// Three distinct states:
//   - connected  : faint center dot every 2s (gated to avoid flicker over arrows)
//   - lost link  : fast 4-corner blink (clearly different from cold boot)
//   - cold boot  : slow single corner dot
basic.forever(function () {
    const quiet = input.runningTime() - lastCmdAt > 1500
    if (bleConnected) {
        if (quiet) {
            led.plot(2, 2)
            basic.pause(80)
            led.unplot(2, 2)
        }
        basic.pause(1920)
    } else if (wasEverConnected) {
        led.plot(0, 0); led.plot(4, 0); led.plot(0, 4); led.plot(4, 4)
        basic.pause(150)
        led.unplot(0, 0); led.unplot(4, 0); led.unplot(0, 4); led.unplot(4, 4)
        basic.pause(350)
    } else {
        led.plot(0, 0)
        basic.pause(120)
        led.unplot(0, 0)
        basic.pause(880)
    }
})

// --- Helpers ---
function ack(line: string) {
    // ACK back to web app (BLE)
    bluetooth.uartWriteString("ACK " + line + "\n")
    // Log to USB Serial
    serial.writeLine("[ACK] " + line)
}

function showDirectionArrow(dir: string, pressed: string) {
    // Only show arrow on "1" (pressed). On "0" show stop.
    if (pressed != "1") {
        basic.showIcon(IconNames.Square) // stop/neutral
        return
    }

    if (dir == "UP") basic.showArrow(ArrowNames.North)
    else if (dir == "DOWN") basic.showArrow(ArrowNames.South)
    else if (dir == "LEFT") basic.showArrow(ArrowNames.West)
    else if (dir == "RIGHT") basic.showArrow(ArrowNames.East)
    else basic.showIcon(IconNames.SmallSquare)
}

function handleLine(raw: string) {
    const line = raw.trim()
    if (line.length == 0) return

    lastCmdAt = input.runningTime()

    // Log to USB Serial
    serial.writeLine("[BLE RX] " + line)

    // ACK everything received
    ack(line)

    // Parse simple command formats:
    // CMD UP 1
    // CMD LEFT 0
    // CMD STOP 1
    const parts = line.split(" ")
    if (parts.length >= 2 && parts[0] == "CMD") {
        const cmd = parts[1]

        if (cmd == "STOP") {
            basic.showIcon(IconNames.Square)
            serial.writeLine("[CMD] STOP")
            return
        }

        if (parts.length >= 3) {
            const val = parts[2] // "1" or "0"
            showDirectionArrow(cmd, val)
            serial.writeLine("[CMD] " + cmd + " " + val)
            return
        }
    }

    // For BTN / TXT / anything else:
    // show a small dot as "activity"
    led.toggle(2, 2)
}

// Read lines delimited by newline
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    const line = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    handleLine(line)
})
