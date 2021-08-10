using Pkg, Logging

Logging.global_logger(NullLogger())
Pkg.instantiate(io = devnull)

using JuliaHubClient, JSON

auth, _ = JuliaHubClient.authenticate()
try
    r = JuliaHubClient.extend_job(ARGS[1], parse(Int, ARGS[2]); auth = auth)

    JSON.print(stderr, Dict(
        "success" => r["success"],
        "message" => r["message"]
    ))
catch err
    msg = "Unknown Error."
    if err isa JuliaHubClient.RequestError
        msg = string("Request failed:\n", err.msg)
    elseif err isa JuliaHubClient.AuthError
        msg = string("Authentication failed:\n", err.msg)
    end

    return JSON.print(stderr, Dict(
        "success" => false,
        "message" => msg
    ))
end
