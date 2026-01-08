local logger = require("logger")
local millennium = require("millennium")
local utils = require("utils")

-- ====== STATE ======

local settings = ""
local styleCSS = ""

-- ====== read_file ======

local function read_file(path)
    local content, err = utils.read_file(path)
    return content
end

-- ====== launch_without_console ======

local ffi = require("ffi")

ffi.cdef[[
typedef unsigned long DWORD;
typedef int BOOL;
typedef void* HANDLE;
typedef const char* LPCSTR;
typedef char* LPSTR;

typedef struct {
  DWORD cb;
  LPSTR lpReserved;
  LPSTR lpDesktop;
  LPSTR lpTitle;
  DWORD dwX;
  DWORD dwY;
  DWORD dwXSize;
  DWORD dwYSize;
  DWORD dwXCountChars;
  DWORD dwYCountChars;
  DWORD dwFillAttribute;
  DWORD dwFlags;
  unsigned short wShowWindow;
  unsigned short cbReserved2;
  void* lpReserved2;
  HANDLE hStdInput;
  HANDLE hStdOutput;
  HANDLE hStdError;
} STARTUPINFOA;

typedef struct {
  HANDLE hProcess;
  HANDLE hThread;
  DWORD dwProcessId;
  DWORD dwThreadId;
} PROCESS_INFORMATION;

BOOL CreateProcessA(
  LPCSTR lpApplicationName,
  LPSTR lpCommandLine,
  void* lpProcessAttributes,
  void* lpThreadAttributes,
  BOOL bInheritHandles,
  DWORD dwCreationFlags,
  void* lpEnvironment,
  LPCSTR lpCurrentDirectory,
  STARTUPINFOA* lpStartupInfo,
  PROCESS_INFORMATION* lpProcessInformation
);

BOOL CloseHandle(HANDLE hObject);
]]

local CREATE_NO_WINDOW     = 0x08000000
local STARTF_USESHOWWINDOW = 0x00000001
local SW_HIDE              = 0

local function launch_without_console(path)
    local command = string.format('cmd /c start "" /B "%s"', path)
    local si = ffi.new("STARTUPINFOA")
    si.cb = ffi.sizeof(si)
    si.dwFlags = STARTF_USESHOWWINDOW
    si.wShowWindow = SW_HIDE

    local pi = ffi.new("PROCESS_INFORMATION")

    local cmd = ffi.new("char[?]", #command + 1)
    ffi.copy(cmd, command)

    local ok = ffi.C.CreateProcessA(
        nil,
        cmd,
        nil,
        nil,
        false,
        CREATE_NO_WINDOW,
        nil,
        nil,
        si,
        pi
    )

    if ok == 0 then
        return false
    end

    ffi.C.CloseHandle(pi.hThread)
    ffi.C.CloseHandle(pi.hProcess)
    return true
end

local function launch_with_console(path)
    local command = string.format('cmd /c start "" /B "%s"', path)
    return os.execute(command)
end

-- ====== BACKEND API ======

function get_settings()
    return tostring(settings)
end

function get_styleCSS()
    return tostring(styleCSS)
end

function get_installPath()
    return tostring(string.gsub(utils.get_backend_path(), "\\backend", ""))
end

function print_log(text)
    logger:info("[Apps-buttons] " .. tostring(text));
    return "[Apps-buttons] " .. tostring(text);
end

function print_error(text)
    logger:error("[Apps-buttons] " .. tostring(text));
    return "[Apps-buttons] " .. tostring(text);
end

function call_back_backend(app_path)
    logger:info("start call_back with path: " .. app_path)

    local result = launch_without_console(app_path)

    if result == 0 or result == true then
        logger:info("call_back launch_without_console success, open file: " .. app_path)
        return "success"
    end

    local result = launch_with_console(app_path)

    if result == 0 or result == true then
        logger:info("call_back launch_with_console success, open file: " .. app_path)
        return "success"
    end

    logger:error("call_back fail: " .. app_path .. " | " .. tostring(result))
    return "fail"
end

-- ====== PLUGIN LIFECYCLE ======

local function on_load()
    logger:info("Comparing millennium version: " .. millennium.cmp_version(millennium.version(), "2.29.3"))
    logger:info("Apps Buttons plugin loaded with Millennium version " .. millennium.version())

    logger:info("Plugin base dir: " .. millennium.get_install_path())

    local install_path = get_installPath()
    logger:info("install path: " .. install_path)

    local settings_path = install_path .. "/settings.json"
    logger:info("settings path: " .. settings_path)

    local content = read_file(settings_path)
    if content then
        settings = content
        logger:info("settings loaded: " .. settings)
    else
        logger:error("failed to load settings.json")
    end

    local TopButtonsStyle_path = install_path .. "/TopButtonsStyle.css"
    logger:info("TopButtonsStyle path: " .. TopButtonsStyle_path)

    local content = read_file(TopButtonsStyle_path)
    if content then
        styleCSS = content
        logger:info("TopButtonsStyle loaded: " .. styleCSS)
    else
        logger:error("failed to load TopButtonsStyle.css")
    end

    millennium.ready()
end

local function on_unload()
    logger:info("Plugin Apps Buttons unloaded")
end

local function on_frontend_loaded()
    logger:info("Frontend loaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
