using Pkg

Pkg.instantiate()

using JuliaHubClient, JSON

auth, _ = JuliaHubClient.authenticate()
try
    r = JuliaHubClient.extend_job(ARGS[1], parse(Int, ARGS[2]); auth = auth)

    JSON.print(stdout, Dict(
        "success" => r["success"],
        "message" => r["message"]
    ))
catch err
    JSON.print(stdout, Dict(
        "success" => false,
        "message" => err
    ))
end
