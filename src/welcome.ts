import * as vscode from 'vscode'
import * as path from 'path'
import { env } from 'process'
import { existsSync, readFileSync } from 'fs'

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | null = null

    const showWelcomeScreen = () => {
        panel = vscode.window.createWebviewPanel(
            'juliahub-welcome-pane',
            'Welcome',
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
    let content = `
    <h1>Welcome to JuliaHub</h1>
    <h2>Julia</h2>
    <p>
        <div>
            <a href="command:language-julia.startREPL">Start REPL</a>
        </div>
        <div>
            <a href="command:REPLVariables.focus">Show Workspace</a>
        </div>
    </p>
    <p>
        <div>
            <a href="https://docs.julialang.org/en/v1/">Julia Documentation</a>
        </div>
        <div>
            <a href="https://www.julia-vscode.org/docs/stable/">Extension Documentation</a>
        </div>
    </p>

    <h2>JuliaHub</h2>
    <div>
        <a href="command:juliahub:Show-JuliaHub-Pane">Show JuliaHub connector</a>
    </div>
    <div>
        <a href="https://docs.juliahub.com/">Documentation</a>
    </div>`

    try {
        const welcomeContentFile = process.env['JH_WELCOME_CONTENT']
        if (welcomeContentFile && existsSync(welcomeContentFile)) {
            content = readFileSync(welcomeContentFile).toString()
        }
    } catch (err) {
        console.log(err)
    }


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
        h2, h3, h4, h5 {
            font-weight: 400;
        }
    </style>
    </head>
    <body>
        ${content}
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