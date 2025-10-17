# Millennium Apps Buttons

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub Repo stars](https://img.shields.io/github/stars/diemonic1/Millennium-apps-buttons)
![GitHub issues](https://img.shields.io/github/issues/diemonic1/Millennium-apps-buttons)

Этот плагин позволяет добавлять в клиент Steam дополнительные кнопки, с помощью которых можно запускать любые программы на вашем компьютере или открывать веб-сайты.

<img width="704" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />

![2025-10-16 21-50-43 (1) (1)](https://github.com/user-attachments/assets/4ba9a64c-d005-47ff-8bc0-6e88bdc58eb4)

# Настройка

После установки вы увидите в клиенте стандартные кнопки. Нажав по кнопке настроек, вы перейдете в директорию, где хранится файл settings.json с настройками плагина.

В нем вы можете указать, как будут выглядеть кнопки, и какие программы или сайты они должны открывать.

Вы можете не показывать у кнопок иконки или текстовое имя (но одно из двух показывать нужно обязательно).

Вы можете запускать в том числе .bat и .vbs скрипты.

В строке настроек styleCSS вы можете изменить стили, применяемые к кнопкам, под ваши предпочтения.

Учтите, что ковычки внутри пути к программе должны быть двойными: \\

В качестве иконок вы можете использовать ссылки на любые картинки из интернета, например, картинки из этого репозитория:
```
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/settings.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/cover.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/epicGames.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png
https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png
```

Для примера, вот мой settings.json:
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
    ],
    "styleCSS": ".millennium-apps-buttons { margin-right: 9px; padding: 0px 3px; border-radius: 2px; height: 24px; background-color: rgba(103, 112, 123, .2); color: #8b929a; transition: all 0.4s; } .millennium-apps-buttons:hover { background-color: rgba(103, 112, 123, 0.5); } .millennium-apps-buttons-inner-div { z-index: 1000; pointer-events: auto; -webkit-app-region: no-drag; user-select: none; display: flex; align-items: center; padding: 0px 5px; cursor: pointer; } .millennium-apps-buttons-img { width: 18px; height: 18px; } .millennium-apps-buttons-img-with-margin { margin-top: 2px; width: 18px; height: 18px; } .millennium-apps-buttons-text-with-margin { margin-left: 5px; }"
}
```
<img width="704" height="243" alt="image" src="https://github.com/user-attachments/assets/16573323-de41-45bb-80d3-37c71ad159b0" />

Стандартный пример:
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
    ],
    "styleCSS": ".millennium-apps-buttons { margin-right: 9px; padding: 0px 3px; border-radius: 2px; height: 24px; background-color: rgba(103, 112, 123, .2); color: #8b929a; transition: all 0.4s; } .millennium-apps-buttons:hover { background-color: rgba(103, 112, 123, 0.5); } .millennium-apps-buttons-inner-div { z-index: 1000; pointer-events: auto; -webkit-app-region: no-drag; user-select: none; display: flex; align-items: center; padding: 0px 5px; cursor: pointer; } .millennium-apps-buttons-img { width: 18px; height: 18px; } .millennium-apps-buttons-img-with-margin { margin-top: 2px; width: 18px; height: 18px; } .millennium-apps-buttons-text-with-margin { margin-left: 5px; }"
}
```
<img width="904" height="367" alt="16 10 2025 - 22ч20м40с" src="https://github.com/user-attachments/assets/c28ad11c-d9bc-4c26-b0af-f18633dd7068" />

## Необходимые компоненты
- [Millennium](https://steambrew.app/)
