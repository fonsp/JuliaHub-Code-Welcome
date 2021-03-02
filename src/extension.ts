import * as vscode from 'vscode'
import * as welcome from './welcome'
import * as startAppView from './startAppView'

const shutdownWarnInterval = 30000 // ms
let shutdownWarner: NodeJS.Timeout|undefined = undefined

export function activate(context: vscode.ExtensionContext) {
    welcome.activate(context)
    startAppView.activate(context)
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
        let timeout = 0
        for (const threshold of thresholds.reverse()) {
            if (diffInMinutes < threshold) {
                timeout = threshold
                break
            }
        }

        // TODO: would be nice to add a button here to extend the time limit:
        vscode.window.showWarningMessage(`This session will time out in ${timeout} minutes. Make sure to backup your work or extend the time limit on JuliaHub.`)
    }
}

export function deactivate() {
    if (shutdownWarner) {
        clearInterval(shutdownWarner)
    }
}
