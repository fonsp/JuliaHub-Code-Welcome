import * as vscode from 'vscode'
import * as welcome from './welcome'

const shutdownWarnInterval = 55000 // ms
let shutdownWarner: NodeJS.Timeout|undefined = undefined

export function activate(context: vscode.ExtensionContext) {
    welcome.activate(context)
    shutdownWarner = setInterval(shutdownWarn, shutdownWarnInterval)
}

const thresholds = [30, 15, 10, 5, 4, 3, 2, 1]
function shutdownWarn() {
    const stopTimeStamp = process.env['JH_JOB_STOP_TIME']
    if (stopTimeStamp) {
        const diffInMinutes = (Date.parse(stopTimeStamp) - Date.now())/1000/60
        if (diffInMinutes < 0 && shutdownWarner) {
            clearInterval(shutdownWarner)
        }
        console.debug(`Instance shutdown in ${Math.round(diffInMinutes)} minutes...`)
        let timeout = 0
        for (const threshold of thresholds.reverse()) {
            if (Math.abs(threshold - diffInMinutes) <= 1) {
                timeout = threshold
                break
            }
        }

        // TODO: would be nice to add a button here to extend the time limit:
        if (timeout > 0) {
            vscode.window.showWarningMessage(`This session will time out in ${timeout} minutes. Make sure to backup your work or extend the time limit on JuliaHub.`)
        }
    }
}

export function deactivate() {
    if (shutdownWarner) {
        clearInterval(shutdownWarner)
    }
}
