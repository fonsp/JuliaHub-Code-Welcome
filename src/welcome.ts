import * as vscode from 'vscode'
import * as path from 'path'

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | null = null

    const showWelcomeScreen = () => {
        panel = vscode.window.createWebviewPanel(
            'juliahub-welcome-pane',
            'Welcome to JuliaHub',
            vscode.ViewColumn.One,
            {
                enableCommandUris: true,
                enableScripts: true
            }
        )
        const showOnStartup = vscode.workspace.getConfiguration('juliahub-welcome').get('show', true)
        panel.webview.html = getWebviewContent(showOnStartup)
        panel.iconPath = {
            dark: vscode.Uri.file(path.join(context.extensionPath, 'assets', 'juliahub-logo-small-dark.svg')),
            light: vscode.Uri.file(path.join(context.extensionPath, 'assets', 'juliahub-logo-small-light.svg'))
        }

        panel.webview.onDidReceiveMessage(msg => {
            if (msg.type === 'showOnStart') {
                const config = vscode.workspace.getConfiguration('juliahub-welcome')
                config.update('show', Boolean(msg.value), true)
            } else {
                console.error('unknown message received')
            }
        })
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('juliahub-welcome.show', () => {
            if (panel) {
                panel.reveal()
            } else {
                showWelcomeScreen()
            }
        })
    )

    if (vscode.workspace.getConfiguration('juliahub-welcome').get('show', true)) {
        showWelcomeScreen()
    }
}

function getWebviewContent(showOnStartup = true) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to JuliaHub</title>
    <style>
        a {
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
    </head>
    <body>
        <h1>Welcome to JuliaHub</h1>
        <p>
            <a href="command:juliahub:Show-JuliaHub-Pane">Show JuliaHub connector</a>
        </p>
        <p>
            <a href="https://docs.juliahub.com/">Show Help</a>
        </p>
        <p>
            <input
                id="show-on-startup"
                type="checkbox"
                ${showOnStartup ? 'checked' : ''}
                onclick=""
            ></input>
            <label for="show-on-startup">Show welcome page on startup</label>
        </p>
        <script>
            const vscode = acquireVsCodeApi()

            const checkbox = document.getElementById('show-on-startup')
            checkbox.addEventListener('click', () => {
                vscode.postMessage({
                    type: 'showOnStart',
                    value: checkbox.checked
                })
            })
        </script>
    </body>
    </html>`
}