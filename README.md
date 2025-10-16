# Millennium Apps Buttons

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub Repo stars](https://img.shields.io/github/stars/diemonic1/Millennium-apps-buttons)
![GitHub issues](https://img.shields.io/github/issues/diemonic1/Millennium-apps-buttons)

[🇷🇺 Документация на русском](README_ru.md) 

This plugin allows you to add additional buttons to the Steam client, which allow you to launch any programs on your computer or open websites.

<img width="704" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />

![2025-10-16 21-50-43 (1) (1)](https://github.com/user-attachments/assets/4ba9a64c-d005-47ff-8bc0-6e88bdc58eb4)

# Configuration

After installation, you'll see standard buttons in the client. Clicking the settings button will take you to the directory where the settings.json file with the plugin's settings is stored.

There, you can specify how the buttons will look and which programs or websites they should open.

You can choose not to display icons or text names for the buttons (but one of these is required).

You can also run .bat and .vbs scripts.

Note that the quotes in the program path must be double-quoted: \\\

You can use links to any images from the internet as icons, for example, images from this repository:
```
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/settings.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/cover.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/epicGames.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png
```

For example, this is my settings.json:
```
{
    "links": [
        {
            "name": "Steam",
            "show_name": "false",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png",
            "show_icon": "true",
            "path_to_app": "https://store.steampowered.com/"
        },
        {
            "name": "Update Grids",
            "show_name": "false",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/cover.png",
            "show_icon": "true",
            "path_to_app": "S:\\Programs\\5_Steam\\steamgrid_windows\\UpdateSteamGrids.vbs"
        },
        {
            "name": "Epic Games Store",
            "show_name": "false",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/epicGames.png",
            "show_icon": "true",
            "path_to_app": "S:\\Programs\\Epic Games\\Launcher\\Engine\\Binaries\\Win64\\EpicGamesLauncher.exe"
        }
    ]
}
```
<img width="704" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />

Standart Example:
```
{
    "links": [
        {
            "name": "Settings",
            "show_name": "true",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/settings.png",
            "show_icon": "true",
            "path_to_app": "C:\\PROGRA~2\\Steam\\plugins\\millennium-apps-buttons"
        },
        {
            "name": "Steam",
            "show_name": "false",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png",
            "show_icon": "true",
            "path_to_app": "https://store.steampowered.com/"
        },
        {
            "name": "SteamDB",
            "show_name": "true",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png",
            "show_icon": "true",
            "path_to_app": "https://steamdb.info/"
        },
        {
            "name": "SteamGridDB",
            "show_name": "true",
            "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png",
            "show_icon": "false",
            "path_to_app": "https://www.steamgriddb.com/"
        }
    ]
}
```
<img width="904" height="367" alt="16 10 2025 - 22ч20м40с" src="https://github.com/user-attachments/assets/c28ad11c-d9bc-4c26-b0af-f18633dd7068" />

## Prerequisites
- [Millennium](https://steambrew.app/)
