import {callable, Millennium, sleep } from "@steambrew/client";

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const call_back = callable<[{ app_path: string }], string>('Backend.call_back');
const print_log = callable<[{ text: string }], string>('Backend.print_log');
const print_error = callable<[{ text: string }], string>('Backend.print_error');
const get_settings = callable<[{}], string>('Backend.get_settings');
const get_styleCSS = callable<[{}], string>('Backend.get_styleCSS');

async function SyncLog(textS: string) {
    await print_log({ text: textS });
}

function FormatGameName(str: string) {
    str = str.replace(/([^A-Z])([A-Z]{2,})(?![A-Z])/g, '$1+$2');
    str = str.replace(/([^A-Z]|^)([A-Z])(?![A-Z])/g, '$1+$2');
    str = str.replace(/\s+/g, '+');
    str = str.replace(/^\+/, '').replace(/\+$/, '');
    str = str.replace(/\++/g, '+');
    return str.trim();
}

window.mouseX = 0;
window.mouseY = 0;

let global_object_settings = "";

let TopButtonsWasSpawned = false;

async function SpawnTopButtons(popup: any, object_settings: any) {
    SyncLog("try to spawn top puttons");

    if (!TopButtonsWasSpawned) {
        TopButtonsWasSpawned = true;
        
        if (object_settings.top_buttons.length <= 0) return;

        let anyItem = await WaitForElement("div.tool-tip-source", popup.m_popup.document);

        SyncLog("start get_settings");

        const styleCSSStr = await get_styleCSS({});

        const style = popup.m_popup.document.createElement("style");
        style.textContent = styleCSSStr;
        popup.m_popup.document.head.appendChild(style);

        object_settings.top_buttons.forEach((app : string) => {
            const newElement = popup.m_popup.document.createElement("div");

            const name = app.name == "" ? "Empty name" : app.name;

            newElement.classList.add("millennium-apps-buttons");

            newElement.title = name;

            const icon = app.icon.includes("www") || app.icon.includes("http")
                ? app.icon : "https://raw.githubusercontent.com/diemonic1/CatPilot/refs/heads/main/CatPilot.png";

            if (app.show_name == "true" && app.show_icon == "true"){
                newElement.innerHTML = `
                    <div
                        class="millennium-apps-buttons-inner-div"
                    >
                        <img
                            class="millennium-apps-buttons-img"
                            src="` + icon + `"
                        >
                        <span
                            class="millennium-apps-buttons-text-with-margin"
                        >` + name + `</span>    
                    </div>
                `;
            }
            else if (app.show_name == "true") {
                newElement.innerHTML = `
                    <div
                        class="millennium-apps-buttons-inner-div"
                    >
                        <span>` + name + `</span>    
                    </div>
                `;
            }
            else {
                newElement.innerHTML = `
                    <div
                        class="millennium-apps-buttons-inner-div"
                    >
                        <img
                            class="millennium-apps-buttons-img-with-margin"
                            src="` + icon + `"
                        > 
                    </div>
                `;
            }

            newElement.addEventListener("click", async () => {
                let result = await call_back({
                    app_path: app.path_to_app
                });
                SyncLog("result: " + result);
            });

            anyItem.parentNode.insertBefore(newElement, anyItem);
        });
    }
}

async function SpawnConextMenuButtons(popup: any, object_settings: any) {

    if (object_settings.right_click_on_game_context_menu_buttons.length <= 0
        && object_settings.right_click_on_game_context_menu_buttons_drop_down.items.length <= 0
    ) return;

    SyncLog("try to spawn ConextMenu Buttons");
    const container = popup.m_popup.document.getElementById("popup_target");

    popup.m_popup.document.addEventListener("mousemove", e => {
        window.mouseX = e.clientX;
        window.mouseY = e.clientY;
    });

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    try{
                        let elementPossiblePlayButton = node.children[0].children[0];

                        if (!elementPossiblePlayButton.className.includes("Play")
                            && !elementPossiblePlayButton.className.includes("Install")
                            && !elementPossiblePlayButton.className.includes("Launch")
                            && !elementPossiblePlayButton.className.includes("Update")
                        ) 
                        {
                            return;
                        }

                        const draggables = container.querySelectorAll('[draggable="true"]');

                        const x = window.mouseX;
                        const y = window.mouseY;

                        let lastClickedElement = "";

                        for (const el of draggables) {
                            const rect = el.getBoundingClientRect();
                            if (
                                x >= rect.left &&
                                x <= rect.right &&
                                y >= rect.top &&
                                y <= rect.bottom
                            ) {
                                SyncLog("element was clicked : " + el.children[1].innerText);
                                lastClickedElement = el.children[1].innerText;
                            }
                        }

                        // just buttons
                        if (object_settings.right_click_on_game_context_menu_buttons.length > 0)
                        {
                            let element = node.children[0].lastElementChild;

                            if (element == null || element == undefined) return;

                            object_settings.right_click_on_game_context_menu_buttons.forEach((app : string) => {
                                const app_path_s = app.path_to_app.replace("%GAME_NAME%", 
                                    app.format_game_name == "true"
                                        ? FormatGameName(lastClickedElement)
                                        : lastClickedElement
                                );

                                let myButton = element.cloneNode(true);

                                myButton.textContent = app.name + (app.add_arrow_icon == "true" ? " ↗" : "");
                            
                                myButton.addEventListener("click", async () => {
                                    let result = await call_back({
                                        app_path: app_path_s
                                    });
                                });

                                node.children[0].appendChild(myButton);
                                SyncLog("added node in ConextMenu");
                            });
                        }

                        // buttons in drop down menu
                        if (object_settings.right_click_on_game_context_menu_buttons_drop_down.items.length > 0)
                        {
                            let element = node.children[0].children[3];

                            if (element == null || element == undefined) return;

                            let myListButton = element.cloneNode(true);

                            let myList = popup.m_popup.document.getElementById("apps_buttons_additional_drop_down_menu");

                            if (myList == null || myList == undefined)
                            {
                                myList = node.cloneNode(true);
                                node.parentNode.appendChild(myList);
                            }

                            while (myList.children[0].firstChild) {
                                myList.children[0].removeChild(myList.children[0].firstChild);
                            }

                            myListButton.children[0].textContent = object_settings.right_click_on_game_context_menu_buttons_drop_down.name;

                            const n = Number(object_settings.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);

                            const children = node.children[0].children;
                            if (n >= children.length) {
                                node.children[0].appendChild(myListButton);
                            } else {
                                node.children[0].insertBefore(myListButton, children[n]);
                            }

                            const rect = myListButton.getBoundingClientRect();

                            myListButton.addEventListener("mouseenter", async () => {
                                myList.style = "visibility: visible; top: " + rect.top + "px; left: " + rect.right + "px;";
                            });

                            myList.addEventListener("mouseenter", async () => {
                                myList.style = "visibility: visible; top: " + rect.top + "px; left: " + rect.right + "px;";
                            });

                            myListButton.addEventListener("mouseleave", async () => {
                                myList.style = "visibility: hidden; display: none; top: 0px; left: 0px;";
                            });

                            myList.addEventListener("mouseleave", async () => {
                                myList.style = "visibility: hidden; display: none; top: 0px; left: 0px;";
                            });

                            myList.id = "apps_buttons_additional_drop_down_menu";
                            myList.style = "visibility: hidden; display: none; top: 0px; left: 0px;";

                            object_settings.right_click_on_game_context_menu_buttons_drop_down.items.forEach((app : string) => {
                                const app_path_s = app.path_to_app.replace("%GAME_NAME%", 
                                    app.format_game_name == "true"
                                        ? FormatGameName(lastClickedElement)
                                        : lastClickedElement
                                );

                                let myButton = element.cloneNode(true);

                                myButton.textContent = app.name + (app.add_arrow_icon == "true" ? " ↗" : "");
                            
                                myButton.addEventListener("click", async () => {
                                    let result = await call_back({
                                        app_path: app_path_s
                                    });
                                });

                                myList.children[0].appendChild(myButton);
                                SyncLog("added node in ConextMenu");
                            });
                        }
                    }
                    catch (error){
                        
                    }
                });
            }
        }
    });

    observer.observe(container, {
        childList: true,
        subtree: true
    });
}

async function SpawnPropertiesMenuButtons(popup: any, object_settings: any) {

    if (object_settings.game_properties_menu_buttons.length <= 0) return;

    let mainPanel = await WaitForElement("div.PageListColumn", popup.m_popup.document);
    
    if (mainPanel == null || mainPanel == undefined) return;

    SyncLog("start clone node in Properties Menu");

    let element = mainPanel.children[1].children[1];

    if (!element.id.includes("general")
        && !element.id.includes("updates")
        && !element.id.includes("localfiles")
        && !element.id.includes("shortcut")
        && !element.id.includes("controller")
        && !element.id.includes("gamerecording")
        && !element.id.includes("customization"))
    {
        return;
    }

    object_settings.game_properties_menu_buttons.forEach((app : string) => {
        const app_path_s = app.path_to_app.replace("%GAME_NAME%", 
            app.format_game_name == "true"
                ? FormatGameName(popup.m_strTitle)
                : popup.m_strTitle
        );

        let myButton = element.cloneNode(true);

        myButton.textContent = app.name + (app.add_arrow_icon == "true" ? " ↗" : "");
    
        myButton.addEventListener("click", async () => {
            let result = await call_back({
                app_path: app_path_s
            });
        });

        mainPanel.children[1].appendChild(myButton);
        SyncLog("added node in Properties Menu");
    });
}

async function SpawnStoreSupernavButtons(popup: any, object_settings: any) {

    if (object_settings.store_supernav_buttons.length <= 0) return;

    SyncLog("start clone node in Store Supernav Menu");

    const anyItem = await WaitForElement("div.contextMenuItem", popup.m_popup.document);

    object_settings.store_supernav_buttons.forEach((app : string) => {
        let myButton = anyItem.cloneNode(true);

        myButton.textContent = app.name + (app.add_arrow_icon == "true" ? " ↗" : "");
    
        myButton.addEventListener("click", async () => {
            let result = await call_back({
                app_path: app.path_to_app
            });
        });

        anyItem.parentNode.appendChild(myButton);
        SyncLog("added node in Store Supernav Menu");
    });
}

async function OnPopupCreation(popup: any) {
    await print_log({ text: "OnPopupCreation"});

    if (global_object_settings == "")
    {
        SyncLog("start get_settings");

        const jsonStr = await get_settings({});
        
        SyncLog("jsonStr: " + jsonStr);

        try {
            global_object_settings = JSON.parse(jsonStr);
            SyncLog("valid json: " + global_object_settings);
        } catch (e) {
            await print_error({ text: "invalid json: " + e});
            return;
        }
    }

    if (popup.m_strName === "SP Desktop_uid0") {
        SpawnTopButtons(popup, global_object_settings);
        SpawnConextMenuButtons(popup, global_object_settings)
    }
    if (popup.m_strTitle === "Store Supernav") {
        SpawnStoreSupernavButtons(popup, global_object_settings)
    }

    SpawnPropertiesMenuButtons(popup, global_object_settings);
}

export default async function PluginMain() {
    console.log("[millennium-apps-buttons] frontend startup");
    await App.WaitForServicesInitialized();

    while (
        typeof g_PopupManager === 'undefined' ||
        typeof MainWindowBrowserManager === 'undefined'
    ) {
        await sleep(100);
    }

    const Desktop = g_PopupManager.GetExistingPopup("SP Desktop_uid0");
	if (Desktop) {
		OnPopupCreation(Desktop);
	}

    g_PopupManager.m_mapPopups.data_.forEach(popup => {
        if (popup.value_.m_strTitle === "Store Supernav") {
            OnPopupCreation(popup.value_);
        }
    });

	g_PopupManager.AddPopupCreatedCallback(OnPopupCreation);
}
