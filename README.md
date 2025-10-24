# Millennium Apps Buttons

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub Repo stars](https://img.shields.io/github/stars/diemonic1/Millennium-apps-buttons)
![GitHub issues](https://img.shields.io/github/issues/diemonic1/Millennium-apps-buttons)

[🇷🇺 Документация на русском](README_ru.md) 

This plugin allows you to add additional buttons to the Steam client, which allow you to launch any programs on your computer or open websites.

![2025-10-16 21-50-43 (1) (1)](https://github.com/user-attachments/assets/4ba9a64c-d005-47ff-8bc0-6e88bdc58eb4)

<img width="604" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />
<img width="333" height="324" alt="23 10 2025 - 20ч30м54с" src="https://github.com/user-attachments/assets/2e428a7d-ff51-48ba-ad86-66ae0a6bd4fe" />

# Configuration

After installation, you'll see standard buttons in the client. Clicking the settings button will take you to the directory where the settings.json file with the plugin's settings is stored.
There, you can specify how the buttons will look and which programs or websites they should open.

> [!TIP]
> You can choose not to show icons or text names for the top buttons (but one of the two is required).

> [!TIP]
> For buttons added to the context menu or properties menu, you can choose whether to show the arrow icon.

> [!TIP]
> Buttons added to the menu can receive the %GAME_NAME% parameter - the game name. At runtime, this parameter is replaced with the game name.

> [!IMPORTANT]
> The "format_game_name" parameter determines whether the name is formatted (a space is placed before capital letters, and all space characters are replaced with + signs so that the game name is recognized when searching online). If the parameter is false, the game name will be inserted as is, without formatting.

> [!TIP]
> You can also run .bat and .vbs scripts.

> [!IMPORTANT]
> Note that the quotes inside the program path must be double: \\\

You can use links to any images from the internet as icons, for example, images from this repository:
```
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/settings.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/cover.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/epicGames.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png
```

> [!TIP]
> In the TopButtonsStyle.css file, you can change the styles and colors of the buttons as desired.

> [!TIP]
> If you don't need a particular button group, simply leave the group's settings list empty:
> ```
> {
>     "top_buttons": [
>     ],
>     "right_click_on_game_context_menu_buttons": [
>     ],
>     "right_click_on_game_context_menu_buttons_drop_down": 
>     {
>         "name": "Other",
>         "append_after_element_number": "7",
>         "items": [
>         ]
>     },
>     "game_properties_menu_buttons": [
>     ]
> }
> ```

# For example, this is my settings.json:
```
{
    "top_buttons": [
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
    ],
    "right_click_on_game_context_menu_buttons": [
    ],
    "right_click_on_game_context_menu_buttons_drop_down": 
    {
        "name": "Other",
        "append_after_element_number": "7",
        "items": [
            {
                "name": "SteamGridDB",
                "format_game_name": "true",
                "add_arrow_icon": "true",
                "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
            },
            {
                "name": "How Long To Beat",
                "format_game_name": "true",
                "add_arrow_icon": "true",
                "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
            },
            {
                "name": "Backloggd",
                "format_game_name": "true",
                "add_arrow_icon": "true",
                "path_to_app": "https://backloggd.com/search/games/%GAME_NAME%"
            }
        ]
    },
    "game_properties_menu_buttons": [
        {
            "name": "SteamGridDB",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
        },
        {
            "name": "How Long To Beat",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
        }
    ]
}
```
<img width="704" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />
<img width="333" height="314" alt="23 10 2025 - 20ч26м19с" src="https://github.com/user-attachments/assets/4b3bd1d4-f484-47cd-8184-6c3409da312e" />
<img width="665" height="538" alt="18 10 2025 - 10ч38м51с" src="https://github.com/user-attachments/assets/ae8895d2-62f2-4d13-bc66-d611cf43e9e5" />


# Standart Example:
```
{
    "top_buttons": [
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
    ],
        "right_click_on_game_context_menu_buttons": [
        {
            "name": "SteamGridDB",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
        },
        {
            "name": "How Long To Beat",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
        }
    ],
    "right_click_on_game_context_menu_buttons_drop_down": 
    {
        "name": "Other",
        "append_after_element_number": "7",
        "items": [
            {
                "name": "SteamGridDB",
                "format_game_name": "true",
                "add_arrow_icon": "true",
                "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
            },
            {
                "name": "How Long To Beat",
                "format_game_name": "true",
                "add_arrow_icon": "false",
                "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
            }
        ]
    },
    "game_properties_menu_buttons": [
        {
            "name": "SteamGridDB",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
        },
        {
            "name": "How Long To Beat",
            "format_game_name": "true",
            "add_arrow_icon": "false",
            "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
        }
    ]
}
```
<img width="904" height="367" alt="16 10 2025 - 22ч20м40с" src="https://github.com/user-attachments/assets/c28ad11c-d9bc-4c26-b0af-f18633dd7068" />
<img width="333" height="324" alt="23 10 2025 - 20ч30м54с" src="https://github.com/user-attachments/assets/9bf5beba-e8c8-4bb7-b898-ecd6cd8ff669" />
<img width="575" height="531" alt="18 10 2025 - 10ч49м23с" src="https://github.com/user-attachments/assets/822a6255-0140-4935-9411-fdc37bba2d3c" />

## Prerequisites
- [Millennium](https://steambrew.app/)
