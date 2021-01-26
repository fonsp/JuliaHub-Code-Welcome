import * as vscode from 'vscode'
import * as welcome from './welcome'

export function activate(context: vscode.ExtensionContext) {
    welcome.activate(context)
}

export function deactivate() {}
