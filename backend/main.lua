local logger = require("logger")
local millennium = require("millennium")
local utils = require("utils")
local http = require("http")

-- ====== HTTP ======

-- The default Lua-HTTP user agent gets served inconsistently, so a browser one
-- is used here - same approach as in the RSS-feed-in-whats-new plugin.
local REQUEST_OPTIONS = {
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    headers = {
        ["Accept"] = "application/json, text/plain, */*"
    },
    timeout = 5
}

-- Returns the body only for successful responses, so callers never receive an
-- error page that would later fail JSON parsing.
local function fetch(url)
    local response, err = http.request(url, REQUEST_OPTIONS)

    if not response then
        logger:error("[Custom-buttons] request failed for " .. tostring(url) .. ": " .. tostring(err))
        return nil
    end

    if response.status < 200 or response.status >= 300 then
        logger:error("[Custom-buttons] request for " .. tostring(url) .. " returned status " .. tostring(response.status))
        return nil
    end

    return response.body
end

-- ====== BACKEND API ======

-- The frontend runs in a CEF context whose origin steamcommunity.com does not
-- allow, so requests to it are blocked by CORS there and have to go through the
-- backend instead.
function get_url_data(url)
    if not string.find(url, "http", 1, true) then
        return nil
    end

    return fetch(url)
end

function print_log(text)
    logger:info("[Custom-buttons] " .. tostring(text));
    return "[Custom-buttons] " .. tostring(text);
end

function print_error(text)
    logger:error("[Custom-buttons] " .. tostring(text));
    return "[Custom-buttons] " .. tostring(text);
end

-- ====== PLUGIN LIFECYCLE ======

function run_command(text)
    logger:info("[Custom-buttons] run command in background: " .. tostring(text));
    local output, status = utils.exec('start "" "' .. tostring(text) .. '"')
    return "[Custom-buttons] " .. tostring(status);
end

local function on_load()
    logger:info("Comparing millennium version: " .. millennium.cmp_version(millennium.version(), "2.29.3"))
    logger:info("Custom Buttons plugin loaded with Millennium version " .. millennium.version())

    logger:info("Plugin base dir: " .. millennium.get_install_path())

    millennium.ready()
end

local function on_unload()
    logger:info("Plugin Custom Buttons unloaded")
end

local function on_frontend_loaded()
    logger:info("Frontend Custom Buttons loaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
