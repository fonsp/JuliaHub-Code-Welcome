import { promises as fs } from 'fs'
import * as TOML from '@iarna/toml'
import * as path from 'path'
import * as vscode from 'vscode'
import * as welcome from './welcome'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const shutdownWarnInterval = 55000 // ms
let juliaPath = 'julia'
let juliaAPI: any
let extContext: vscode.ExtensionContext|undefined = undefined
let shutdownWarner: NodeJS.Timeout|undefined = undefined

export async function activate(context: vscode.ExtensionContext) {
    welcome.activate(context)
    extContext = context

    try {
        const juliaExt = vscode.extensions.getExtension('julialang.language-julia') || vscode.extensions.getExtension('julialang.language-julia-insider')
        if (juliaExt) {
            juliaAPI = juliaExt.exports
            if (juliaAPI) {
                if (juliaAPI.version <= 2) {
                    juliaPath = await juliaAPI.getJuliaPath()
                } else if (juliaAPI.version === 3) {
                    juliaPath = (await juliaAPI.getJuliaExecutable()).file
                }
            }
        }
    } catch (err) {
        console.log(err)
    }

    shutdownWarner = setInterval(shutdownWarn, shutdownWarnInterval)
}

const thresholds = [30, 15, 10, 5, 2, 1]
async function shutdownWarn() {
    const stopTimeStamp = await getStopTime()
    if (stopTimeStamp) {
        const diffInMinutes = (Date.parse(stopTimeStamp) - Date.now())/1000/60
        if (diffInMinutes < 0 && shutdownWarner) {
            clearInterval(shutdownWarner)
        }
        let timeout = 0
        for (const threshold of thresholds.reverse()) {
            if (Math.abs(threshold - diffInMinutes) <= 1) {
                timeout = threshold
                break
            }
        }


        if (timeout > 0) {
            console.debug(`Instance shutdown in ${Math.round(diffInMinutes)} minutes...`)
            vscode.window.showWarningMessage(
                `This session will time out in ${timeout} minutes. Make sure to backup your work or extend the time limit on JuliaHub.`,
                {
                    modal: timeout < 5
                },
                'Extend Limit'
            ).then(val => {
                if (val) {
                    extendTimeLimit()
                }
            })
        }
    }
}

const META_TOML_PATH = '/home/jrun/.juliahub/meta.toml'
async function getStopTime() {
    try {
        const tomlFile = await fs.readFile(META_TOML_PATH)
        const content = TOML.parse(tomlFile.toString())
        if (content['stop_time']) {
            return <string>content['stop_time']
        }
    } catch (err) {
        console.log('Could not read job stop time from meta.toml.', err)
    }
    return <string>process.env['JH_JOB_STOP_TIME']
}

async function extendTimeLimit() {
    if (extContext === undefined) {
        return
    }
    const extendJobPath = path.join(extContext.extensionPath, 'scripts', 'extend_job.jl')
    const extendJobEnvPath = path.join(extContext.extensionPath, 'scripts')
    const jobName = process.env['JRUN_NAME']

    const extendBy = await vscode.window.showInputBox({
        prompt: 'Number of hours to extend the job time limit by. Note that this may incur additional costs.',
        value: '1',
        validateInput (val) {
            if (/^\d+$/.test(val)) {
                return ''
            } else {
                return 'Must be a positive integer.'
            }
        }
    })

    if (extendBy === undefined) {
        return
    }

    const stopTime = new Date(await getStopTime())

    try {
        const env = process.env

        let pkgServer: string|undefined = ''

        if (juliaAPI && juliaAPI.version >= 2) {
            pkgServer = juliaAPI.getPkgServer()
        } else {
            pkgServer = vscode.workspace.getConfiguration('juliahub').get('packageServer')
        }
        if (pkgServer && !env['JULIA_PKG_SERVER']) {
            env['JULIA_PKG_SERVER'] = pkgServer
        }

        const { stderr } = await promisify(exec)(`"${juliaPath}" --project="${extendJobEnvPath}" "${extendJobPath}" "${jobName}" "${extendBy}"`, {
            env: env
        })

        const response = JSON.parse(stderr)

        if (response.success) {
            vscode.window.showInformationMessage(`Successfully extended this interactive job by ${extendBy} hours.`)

            try {
                const tomlFile = await fs.readFile(META_TOML_PATH)
                const content = TOML.parse(tomlFile.toString())
                stopTime.setTime(stopTime.getTime() + parseInt(extendBy)*60*60*1000)
                content['stop_time'] = stopTime.toJSON()
                await fs.writeFile(META_TOML_PATH, TOML.stringify(content))
            } catch (err) {
                console.log('Could not write job stop time to meta.toml.', err)
            }
            return
        } else {
            vscode.window.showErrorMessage(`Failed to extend job time limit: ${stderr}`)
        }
    } catch (err) {
        console.log(err)
        console.log(err.stdout)
        vscode.window.showErrorMessage(`Failed to extend job time limit: ${err}`,)
    }

}

export function deactivate() {
    if (shutdownWarner) {
        clearInterval(shutdownWarner)
    }
}
