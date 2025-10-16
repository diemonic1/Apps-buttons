import {callable, Millennium, sleep } from "@steambrew/client";

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const call_back = callable<[{ app_path: string }], string>('Backend.call_back');
const print_log = callable<[{ text: string }], string>('Backend.print_log');
const get_settings = callable<[{}], string>('Backend.get_settings');

let ButtonWithAPPSWasAdded = false;

async function OnPopupCreation(popup: any) {
    await print_log({ text: "OnPopupCreation"});

    if (popup.m_strName === "SP Desktop_uid0") {
        
        await print_log({ text: "OnPopupCreation SP Desktop_uid0"});

        var mwbm = undefined;
        while (!mwbm) {
            await print_log({ text: "wait for MainWindowBrowserManager"});
            try {
                mwbm = MainWindowBrowserManager;
            } catch {
                await sleep(100);
            }
        }

        await print_log({ text: "adding buttons"});

        if (!ButtonWithAPPSWasAdded) {
            ButtonWithAPPSWasAdded = true;
            
            let anyItem = await WaitForElement("div.tool-tip-source", popup.m_popup.document);

            await print_log({ text: "start get_settings"});

            const jsonStr = await get_settings({});
            
            await print_log({ text: "jsonStr: " + jsonStr});

            try {
                const obj = JSON.parse(jsonStr);

                await print_log({ text: "valid json: " + obj});

                const style = popup.m_popup.document.createElement("style");
                style.textContent = `
                    .millennium-apps-buttons {
                        margin-right: 9px;
                        padding: 0px 3px;
                        border-radius: 2px;
                        height: 24px;
                        background-color: rgba(103, 112, 123, .2);
                        color: #8b929a;
                        transition: all 0.4s;
                    }
                    .millennium-apps-buttons:hover {
                        background-color: rgba(103, 112, 123, 0.5);
                    }
                    .millennium-apps-buttons-inner-div {
                        z-index: 1000;
                        pointer-events: auto;
                        -webkit-app-region: no-drag;
                        user-select: none;
                        display: flex;
                        align-items: center;
                        padding: 0px 5px;
                        cursor: pointer;
                    }
                `;
                popup.m_popup.document.head.appendChild(style);

                obj.links.forEach((link : string) => {
                    const newElement = popup.m_popup.document.createElement("div");

                    const name = link.name == "" ? "Empty name" : link.name;

                    newElement.classList.add("millennium-apps-buttons");

                    newElement.title = name;

                    const icon = link.icon.includes("www") || link.icon.includes("http")
                        ? link.icon : "https://raw.githubusercontent.com/diemonic1/CatPilot/refs/heads/main/CatPilot.png";

                    if (link.show_name == "true" && link.show_icon == "true"){
                        newElement.innerHTML = `
                            <div
                                class="millennium-apps-buttons-inner-div"
                            >
                                <img
                                    style="
                                        width: 18px;
                                        height: 18px;
                                    "
                                    src="` + icon + `"
                                >
                                <span style="margin-left: 5px;">` + name + `</span>    
                            </div>
                        `;
                    }
                    else if (link.show_name == "true") {
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
                                    style="
                                        margin-top: 2px;
                                        width: 18px;
                                        height: 18px;
                                    "
                                    src="` + icon + `"
                                > 
                            </div>
                        `;
                    }

                    newElement.addEventListener("click", async () => {
                        await print_log({ text: "click: "});
                        let result = await call_back({
                            app_path: link.path_to_app
                        });
                        await print_log({ text: "result: " + result});
                    });

                    anyItem.parentNode.insertBefore(newElement, anyItem);
                });
            } catch (e) {
                print_log({ text: "invalid json: " + e});
            }
        }
    }
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

    const doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0");
	if (doc) {
		OnPopupCreation(doc);
	}

	g_PopupManager.AddPopupCreatedCallback(OnPopupCreation);
}
