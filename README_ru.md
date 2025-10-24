# Millennium Apps Buttons

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub Repo stars](https://img.shields.io/github/stars/diemonic1/Millennium-apps-buttons)
![GitHub issues](https://img.shields.io/github/issues/diemonic1/Millennium-apps-buttons)

Этот плагин позволяет добавлять в клиент Steam дополнительные кнопки, с помощью которых можно запускать любые программы на вашем компьютере или открывать веб-сайты.

![2025-10-16 21-50-43 (1) (1)](https://github.com/user-attachments/assets/4ba9a64c-d005-47ff-8bc0-6e88bdc58eb4)

<img width="604" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />
<img width="333" height="324" alt="23 10 2025 - 20ч30м54с" src="https://github.com/user-attachments/assets/2e428a7d-ff51-48ba-ad86-66ae0a6bd4fe" />

# Настройка

После установки вы увидите в клиенте стандартные верхние кнопки. Нажав по кнопке настроек, вы перейдете в директорию, где хранится файл settings.json с настройками плагина.
В нем вы можете указать, как будут выглядеть кнопки, и какие программы или сайты они должны открывать.

> [!TIP]
> Вы можете не показывать у верхних кнопок иконки или текстовое имя (но одно из двух показывать нужно обязательно).

> [!TIP]
> У кнопок, добавляемых в контекстное меню или меню свойств, можно выбрать, будет показываться иконка стрелочки, или нет.

> [!TIP]
> Кнопки, добавляемые в меню, могут получать параметр %GAME_NAME% - имя игры. Во время выполнения этот параметр заменить на имя игры.

> [!IMPORTANT]
> Параметр "format_game_name" определяет, будет ли форматироваться имя (перед заглавными буквами ставится пробел, а также все символы пробелов заменяются на знаки +, чтобы имя игры распознавалось при поиске в интернете). Если параметр false, имя игры будет вставляться как есть, без форматирования.

> [!TIP]
> Вы также можете запускать .bat и .vbs скрипты.

> [!IMPORTANT]
> Учтите, что кавычки внутри пути к программе должны быть двойными: \\\

В качестве иконок вы можете использовать ссылки на любые картинки из интернета, например, картинки из этого репозитория:
```
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/settings.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/cover.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/epicGames.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png
```

> [!TIP]
> В файле TopButtonsStyle.css вы можете изменить стили и цвета кнопок по вашему желанию.

> [!TIP]
> Если вам не нужна какая-то из групп кнопок, просто оставьте список настроек группы пустым:
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

# Для примера, вот мой settings.json:
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
<img width="665" height="538" alt="18 10 2025 - 10ч38м51с" src="https://github.com/user-attachments/assets/127fea27-0943-41e2-8210-a179d0ab2394" />


# Стандартный пример:
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

## Необходимые компоненты
- [Millennium](https://steambrew.app/)
