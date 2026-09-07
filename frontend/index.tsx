import { Millennium, IconsModule, definePlugin, callable, PanelSection, TextField, Toggle, Field, DropdownItem, Button, DialogButtonPrimary, showModal, ConfirmModal } from '@steambrew/client';
import { getSettings, saveSettings, DEFAULT_SETTINGS_JSON } from './services/settings';
import { Localize, GetLanguageOptions } from './services/localization';
import { useState, useEffect, useRef } from 'react';

const WaitForElement = async (sel: string, parent = document) => [...(await Millennium.findElement(parent, sel))][0];

const print_log = callable<[{ text: string }], string>('print_log');
const print_error = callable<[{ text: string }], string>('print_error');
const run_command = callable<[{ text: string }], string>('run_command');
const get_url_data = callable<[{ url: string }], string>('get_url_data');

const GAME_NAME_PARAMETER = "%GAME_NAME%";
const GAME_ID_PARAMETER = "%GAME_ID%";
const YELLOW_HIGHLIGHT_COLOR = "#ffcc32";

const EMPTY_NAME_PLACEHOLDER = 'Empty name';
const EMPTY_PATH_PLACEHOLDER = 'Empty URL or app path';

const GAME_ID_CACHE_STORAGE_KEY = 'Custom-buttons-game-id-cache-v2';
const STEAM_SEARCH_APPS_URL = 'https://steamcommunity.com/actions/SearchApps/';

const AUTO_SAVE_DELAY = 600;
const RESPAWN_BUTTONS_DELAY = 1500;
const LABEL_GAME_ID_REQUEST_DELAY = 400;

let __idCounter = 0;

window.mouseX = 0;
window.mouseY = 0;

let global_object_settings = '';
let popup_desktop = undefined;
let popup_store_supernav = undefined;

let spawned_top_buttons_to_delete_on_respawn = [];
let spawned_store_supernav_buttons_to_delete_on_respawn = [];

async function call_back(app_path: string){
	if (app_path.includes("https://") || app_path.includes("http://")){
		SyncLog('open web page: ' + app_path);
    	return SteamClient.System.OpenInSystemBrowser(app_path);
	}
	else{
		SyncLog('run command in console: ' + app_path);
		return await run_command({ text: app_path });
	}
}

function generateId() {
    const timestamp = Date.now().toString(36);
    const perf = Math.floor(performance.now() * 1000).toString(36);
    const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const counter = (__idCounter++).toString(36);

    return `${timestamp}-${perf}-${random}-${counter}`;
}

async function SyncLog(textS: string) {
	await print_log({ text: textS });
}

function FormatGameName(str: string) {
	str = str.replace(/([^A-Z])([A-Z]{2,})(?![A-Z])/g, '$1+$2');
	str = str.replace(/([^A-Z]|^)([A-Z])(?![A-Z])/g, '$1+$2');
	str = str.replace(/[\/\\]/g, '+');
	str = str.replace(/\s+/g, '+');
	str = str.replace(/^\+/, '').replace(/\+$/, '');
	str = str.replace(/\++/g, '+');
	return str.trim();
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//#region Game name matching

// Steam ranks its search results by popularity, not by how well they match the
// query, so 'Sniper Ghost Warrior 3' comes back behind two Contracts games.
// These helpers pick the entry whose name is actually the closest one.

type NormalizedName = {
	full: string;
	core: string;
	core_tokens: string[];
	numbers: string;
	noisy: boolean;
};

// Only numerals of two letters or more. Converting single letters would collide
// 'Mega Man X' with 'Mega Man 10' and 'GTA V' with 'GTA 5'.
const ROMAN_NUMERALS: Record<string, string> = {
	ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9',
	xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16',
	xvii: '17', xviii: '18', xix: '19', xx: '20',
};

// Anchored to the end and requires one of the final words, so ordinary titles
// like 'The Game' or 'Cut the Rope' keep their last word.
const EDITION_TAIL = /\s+(?:(?:the\s+)?(?:game\s+of\s+the\s+year|goty|definitive|complete|digital\s+deluxe|deluxe|ultimate|enhanced|special|anniversary|legendary|gold|premium|standard|royal|directors?\s+cut|remastered|redux)\s*)?(?:edition|collection|remastered|remaster|redux|goty|cut)$/;

// These are separate apps in the search results, so they are penalised rather
// than stripped - stripping would make a demo compare equal to the game itself.
const NOISE_WORDS = /\b(?:demo|beta|playtest|prologue|soundtrack|ost|dlc|season\s+pass|dedicated\s+server|server|sdk|benchmark|editor|artbook|art\s+book|trailer)\b/;

const SCORE_EXACT = 100;
const SCORE_CORE = 90;
const SCORE_CONTAINS = 70;
const NOISE_PENALTY = 40;
const ACCEPT_SCORE = 70;

function NormalizeName(raw: string): NormalizedName {
	let s = String(raw ?? '');

	s = s.split('&amp;').join('&').split('&#39;').join("'").split('&quot;').join('"');

	// Before NFKD on purpose: NFKD turns the trademark sign into the letters 'TM'.
	s = s.replace(/[™®©℠]/g, '');
	s = s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();

	// Deleted, not replaced by a space, so "Sid Meier's" does not grow a stray 's'.
	s = s.replace(/['’ʼ´`]/g, '');
	s = s.replace(/(\d),(?=\d{3}\b)/g, '$1');
	s = s.replace(/&/g, ' and ');
	s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

	const tokens = s === '' ? [] : s.split(' ').map((token) => ROMAN_NUMERALS[token] ?? token);

	const full = tokens.join(' ');
	const core = full.replace(EDITION_TAIL, '').trim() || full;

	return {
		full,
		core,
		core_tokens: core === '' ? [] : core.split(' '),
		numbers: tokens.filter((token) => /^\d+$/.test(token)).map((token) => String(Number(token))).join('.'),
		noisy: NOISE_WORDS.test(full),
	};
}

function IsTokenPrefix(short_tokens: string[], long_tokens: string[]): boolean {
	if (short_tokens.length === 0 || short_tokens.length >= long_tokens.length) return false;

	return short_tokens.every((token, index) => token === long_tokens[index]);
}

function ScoreCandidate(query: NormalizedName, candidate: NormalizedName): number {
	// The sequel guard. 'Sniper Ghost Warrior 2' is one character away from part 3,
	// so no similarity measure may reach across a different number sequence.
	if (query.numbers !== candidate.numbers) return -1;

	let score: number;

	if (query.full === candidate.full) {
		score = SCORE_EXACT;
	} else if (query.core === candidate.core) {
		score = SCORE_CORE;
	} else if (IsTokenPrefix(query.core_tokens, candidate.core_tokens)
		|| IsTokenPrefix(candidate.core_tokens, query.core_tokens)) {
		score = SCORE_CONTAINS;
	} else {
		return -1;
	}

	if (candidate.noisy && !query.noisy) score -= NOISE_PENALTY;

	return score;
}

// Returns the index of the closest entry, or -1 when nothing is close enough.
function PickBestSearchResult(game_name: string, results: any[]): { index: number; score: number } {
	const query = NormalizeName(game_name);

	let best_index = -1;
	let best_score = -1;
	let best_distance = Number.MAX_SAFE_INTEGER;

	for (let index = 0; index < results.length; index++) {
		const entry = results[index];
		if (!entry?.appid || typeof entry?.name !== 'string') continue;

		const candidate = NormalizeName(entry.name);
		const score = ScoreCandidate(query, candidate);
		if (score < ACCEPT_SCORE) continue;

		// Prefer the least embellished title of an equally good match.
		const distance = Math.abs(candidate.core_tokens.length - query.core_tokens.length);

		if (score > best_score || (score === best_score && distance < best_distance)) {
			best_index = index;
			best_score = score;
			best_distance = distance;
		}
	}

	return { index: best_index, score: best_score };
}

//#endregion

//#region Game ID parameter

let game_id_cache: Record<string, string> = {};

// Buttons spawn in bursts, so without this every button with %GAME_ID% in its
// name would fire its own identical request and they would run one after another
// in the single-threaded backend, blocking everything else queued behind them.
const game_id_requests = new Map<string, Promise<string>>();

// Bumped when the cache is cleared, so a request that was already in flight at
// that moment cannot silently restore the entry the user just deleted.
let game_id_cache_generation = 0;

function LoadGameIdCache() {
	try {
		const stored = localStorage.getItem(GAME_ID_CACHE_STORAGE_KEY);
		game_id_cache = stored ? JSON.parse(stored) : {};
	} catch {
		game_id_cache = {};
	}
}

function SaveGameIdCache() {
	try {
		localStorage.setItem(GAME_ID_CACHE_STORAGE_KEY, JSON.stringify(game_id_cache));
	} catch (error) {
		SyncLog('failed to save game id cache: ' + error);
	}
}

function ClearGameIdCache() {
	game_id_cache = {};
	game_id_cache_generation++;
	game_id_requests.clear();

	try {
		localStorage.removeItem(GAME_ID_CACHE_STORAGE_KEY);
	} catch (error) {
		SyncLog('failed to clear game id cache: ' + error);
	}

	SyncLog('Game ID cache cleared');
}

function GetGameIdCacheKey(game_name: string) {
	return game_name.trim().toLowerCase();
}

function GetCachedGameId(game_name: string): string | undefined {
	return game_id_cache[GetGameIdCacheKey(game_name)];
}

async function GetGameId(game_name: string): Promise<string> {
	const cache_key = GetGameIdCacheKey(game_name);

	if (cache_key === '') return '';
	if (game_id_cache[cache_key]) return game_id_cache[cache_key];

	const in_flight = game_id_requests.get(cache_key);
	if (in_flight) return in_flight;

	const request = RequestGameId(game_name, cache_key)
		.finally(() => { game_id_requests.delete(cache_key); });

	game_id_requests.set(cache_key, request);

	return request;
}

// Never rejects: every failure is logged and reported as an empty id, so the
// shared promise is safe for all the callers waiting on it.
async function RequestGameId(game_name: string, cache_key: string): Promise<string> {
	const generation = game_id_cache_generation;

	try {
		SyncLog('request game id for: ' + game_name);

		// steamcommunity.com does not allow this CEF context as an origin, so the
		// request is made by the Lua backend, which CORS does not apply to.
		const body = await get_url_data({ url: STEAM_SEARCH_APPS_URL + encodeURIComponent(game_name) });

		if (!body) {
			SyncLog('empty response for game id request: ' + game_name);
			return '';
		}

		const search_result = JSON.parse(body);

		if (!Array.isArray(search_result) || search_result.length === 0) {
			SyncLog('game id for ' + game_name + ' not found');
			return '';
		}

		// Steam orders by popularity, so the first entry is often a different game
		// of the same series. Fall back to it only when no name is close enough.
		const best = PickBestSearchResult(game_name, search_result);
		const chosen = best.index >= 0 ? search_result[best.index] : search_result[0];
		const game_id = chosen?.appid;

		if (best.index > 0) {
			SyncLog('name match for ' + game_name + ': picked "' + chosen.name + '" (#' + best.index
				+ ', score ' + best.score + ') over Steam top result "' + search_result[0].name + '"');
		} else if (best.index < 0) {
			SyncLog('no confident name match for ' + game_name
				+ ', falling back to Steam top result "' + search_result[0].name + '"');
		}

		if (game_id) {
			if (generation === game_id_cache_generation) {
				game_id_cache[cache_key] = String(game_id);
				SaveGameIdCache();
			}

			SyncLog('game id for ' + game_name + ' is ' + game_id);
			return String(game_id);
		}

		SyncLog('game id for ' + game_name + ' not found');
	} catch (error) {
		SyncLog('failed to request game id for ' + game_name + ': ' + error);
	}

	return '';
}

function ReplaceGameName(text: string, game_name: string, format_game_name: boolean) {
	return text.split(GAME_NAME_PARAMETER).join(format_game_name ? FormatGameName(game_name) : game_name);
}

// The game name is replaced right away, the game id only if it is already cached,
// so that spawning buttons never has to wait for a request to Steam.
function ResolveButtonNameWithCache(raw_name: string, game_name: string, format_game_name: boolean) {
	const name = ReplaceGameName(raw_name, game_name, format_game_name);

	if (!name.includes(GAME_ID_PARAMETER)) return name;

	return name.split(GAME_ID_PARAMETER).join(GetCachedGameId(game_name) ?? '');
}

// Sets the button text immediately and updates it again once the game id has been requested.
function SetButtonText(element: any, raw_name: string, game_name: string, format_game_name: boolean, suffix: string) {
	const name = ReplaceGameName(raw_name, game_name, format_game_name);

	element.textContent = ResolveButtonNameWithCache(raw_name, game_name, format_game_name) + suffix;

	if (name.includes(GAME_ID_PARAMETER) && !GetCachedGameId(game_name)) {
		// Only the label needs this, so it waits: a click in the first moments after
		// spawning would otherwise queue behind this request in the backend.
		setTimeout(() => {
			if (element.isConnected === false) return;

			GetGameId(game_name).then((game_id) => {
				element.textContent = name.split(GAME_ID_PARAMETER).join(game_id) + suffix;
			});
		}, LABEL_GAME_ID_REQUEST_DELAY);
	}
}

// The game id is requested here, when the button is actually clicked.
async function ResolveButtonPath(raw_path: string, game_name: string, format_game_name: boolean) {
	const path = ReplaceGameName(raw_path, game_name, format_game_name);

	if (!path.includes(GAME_ID_PARAMETER)) return path;

	return path.split(GAME_ID_PARAMETER).join(await GetGameId(game_name));
}

//#endregion

function IsButtonEnabled(app: any): boolean {
	return app?.enabled !== 'false';
}

function RespawnTopButtons(){
	SyncLog('Start Respawn top Buttons');
	
	spawned_top_buttons_to_delete_on_respawn.forEach((element: any) => {
		if (element) {
			element.remove();
		}
	})

	spawned_top_buttons_to_delete_on_respawn.length = 0;

	SpawnTopButtons(popup_desktop);
}

function RespawnStoreSupernavButtons(){
	SyncLog('Start Respawn Store Supernav Buttons');
	
	spawned_store_supernav_buttons_to_delete_on_respawn.forEach((element: any) => {
		if (element) {
			element.remove();
		}
	})

	spawned_store_supernav_buttons_to_delete_on_respawn.length = 0;

	SpawnStoreSupernavButtons(popup_store_supernav, global_object_settings);
}

//#region Top Buttons

const TOP_BUTTON_ID_PREFIX = 'millennium-custom-buttons-top-button-';

let TopButtonsWasSpawned = false;
let TopButtonsSpawnInProgress = false;

async function SpawnTopButtons(popup: any) {
	if (!popup) return;

	if (TopButtonsSpawnInProgress) return;
	TopButtonsSpawnInProgress = true;

	if (!global_object_settings.top_buttons
		|| global_object_settings.top_buttons.filter(IsButtonEnabled).length === 0)
	{
		TopButtonsSpawnInProgress = false;
		return;
	}

	while (true) {
		SyncLog('Start spawn Top Buttons Once');
		await spawnTopButtonsOnce(popup);

		await sleep(500);

		if (areTopButtonsAlive(popup)) {
			SyncLog('Top buttons successfully in DOM');
			break;
		}

		SyncLog('Top buttons not found, retry...');
		TopButtonsWasSpawned = false;
	}

	TopButtonsSpawnInProgress = false;
}

async function spawnTopButtonsOnce(popup: any) {
	if (!popup) return;

	if (TopButtonsWasSpawned) return;
	TopButtonsWasSpawned = true;

	let styleObj = popup.m_popup.document.getElementById('millennium-custom-buttons-top-buttons-style');

	if (styleObj) {
		styleObj.remove();
	}

	const style = popup.m_popup.document.createElement('style');
	style.id = 'millennium-custom-buttons-top-buttons-style';
	style.textContent = global_object_settings.top_buttons_style.toString();
	popup.m_popup.document.head.appendChild(style);

	const anyItem = await WaitForElement(
		'div.tool-tip-source',
		popup.m_popup.document
	);

	global_object_settings.top_buttons.forEach((app: any, index: number) => {
		if (!IsButtonEnabled(app)) return;

		const id = TOP_BUTTON_ID_PREFIX + index;

		if (popup.m_popup.document.getElementById(id)) return;

		const newElement = popup.m_popup.document.createElement('div');
		newElement.id = id;
		newElement.classList.add('millennium-custom-buttons');

		const name = app.name && app.name !== '' ? app.name : 'Empty name';
		newElement.title = name;

		const icon =
			app.icon?.includes('http')
				? app.icon
				: 'https://raw.githubusercontent.com/diemonic1/CatPilot/refs/heads/main/CatPilot.png';

		if (app.show_name === 'true' && app.show_icon === 'true') {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<img class="millennium-custom-buttons-img" src="${icon}">
					<span class="millennium-custom-buttons-text-with-margin">${name}</span>
				</div>
			`;
		} else if (app.show_name === 'true') {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<span>${name}</span>
				</div>
			`;
		} else {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<img class="millennium-custom-buttons-img-with-margin" src="${icon}">
				</div>
			`;
		}

		newElement.addEventListener('click', async () => {
			const result = await call_back(app.path_to_app);
			SyncLog('result: ' + result);
		});

		anyItem.parentNode.insertBefore(newElement, anyItem);
		spawned_top_buttons_to_delete_on_respawn.push(newElement);
	});
}

function areTopButtonsAlive(popup: any): boolean {
	return global_object_settings.top_buttons.every((app: any, index: number) => {
		if (!IsButtonEnabled(app)) return true;

		return popup.m_popup.document.getElementById(
			TOP_BUTTON_ID_PREFIX + index
		);
	});
}

//#endregion

//#region SpawnContextMenuButtons

function SpawnContextMenuButtons(popup: any, node: any, lastClickedElement: string) {
	const right_click_buttons = global_object_settings.right_click_on_game_context_menu_buttons.filter(IsButtonEnabled);
	const drop_down_items = global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.filter(IsButtonEnabled);

	if (right_click_buttons.length <= 0 && drop_down_items.length <= 0)
	{
		return;
	}

	SyncLog('try to spawn ConextMenu Buttons');

	if (right_click_buttons.length > 0) {
		let element = node.children[0].lastElementChild;

		if (element == null || element == undefined) return;

		right_click_buttons.forEach((app: any) => {
			let myButton = element.cloneNode(true);

			SetButtonText(
				myButton,
				app.name,
				lastClickedElement,
				app.format_game_name == 'true',
				app.add_arrow_icon == 'true' ? ' ↗' : '',
			);

			myButton.addEventListener('click', async () => {
				SyncLog('click button: ' + app.name);
				const app_path_s = await ResolveButtonPath(app.path_to_app, lastClickedElement, app.format_game_name == 'true');
				let result = await call_back(app_path_s);
			});

			node.children[0].appendChild(myButton);
			SyncLog('added node in ConextMenu: ' + myButton.textContent);
		});
	}

	if (drop_down_items.length > 0) {
		let element = node.children[0].children[3];

		if (element == null || element == undefined) return;

		let myListButton = element.cloneNode(true);

		let myList = popup.m_popup.document.getElementById('custom_buttons_additional_drop_down_menu');

		if (myList == null || myList == undefined) {
			myList = node.cloneNode(true);
			node.parentNode.appendChild(myList);
		}

		while (myList.children[0].firstChild) {
			myList.children[0].removeChild(myList.children[0].firstChild);
		}

		myListButton.children[0].textContent = global_object_settings.right_click_on_game_context_menu_buttons_drop_down.name;

		const n = Number(global_object_settings.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);

		const children = node.children[0].children;
		if (n >= children.length) {
			node.children[0].appendChild(myListButton);
		} else {
			node.children[0].insertBefore(myListButton, children[n]);
		}

		const rect = myListButton.getBoundingClientRect();

		myListButton.addEventListener('mouseenter', async () => {
			myList.style = 'visibility: visible; top: ' + rect.top + 'px; left: ' + rect.right + 'px;';
		});

		myList.addEventListener('mouseenter', async () => {
			myList.style = 'visibility: visible; top: ' + rect.top + 'px; left: ' + rect.right + 'px;';
		});

		myListButton.addEventListener('mouseleave', async () => {
			myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';
		});

		myList.addEventListener('mouseleave', async () => {
			myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';
		});

		myList.id = 'custom_buttons_additional_drop_down_menu';
		myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';

		drop_down_items.forEach((app: any) => {
			let myButton = element.cloneNode(true);

			SetButtonText(
				myButton,
				app.name,
				lastClickedElement,
				app.format_game_name == 'true',
				app.add_arrow_icon == 'true' ? ' ↗' : '',
			);

			myButton.addEventListener('click', async () => {
				SyncLog('click button: ' + app.name);
				const app_path_s = await ResolveButtonPath(app.path_to_app, lastClickedElement, app.format_game_name == 'true');
				let result = await call_back(app_path_s);
			});

			myList.children[0].appendChild(myButton);
			SyncLog('added node in ConextMenu DropDown: ' + myButton.textContent);
		});
	}
}

//#endregion

//#region SpawnAppPageButtons

let spawnedAppPageButtonsCount = 0;

function SpawnAppPageButtons(elementsToSpawnAppPageButtons: any, lastClickedElement: string) {
	const app_page_buttons = (global_object_settings.app_page_buttons ?? []).filter(IsButtonEnabled);

	if (app_page_buttons.length <= 0)
	{
		return;
	}

	if (spawnedAppPageButtonsCount >= app_page_buttons.length * 2) {
		return;
	}

	SyncLog('try to spawn AppPage Buttons');

	try{
		elementsToSpawnAppPageButtons.forEach(elementToClone => {
			app_page_buttons.forEach((app: any) => {

				const format_game_name = app.format_game_name ? (app.format_game_name == 'true') : true;

				const button_name = ResolveButtonNameWithCache(app.name, lastClickedElement, format_game_name);

				const parent2 = elementToClone.parentElement.parentElement;

				const clone = parent2.cloneNode(true);

				const target = clone.firstElementChild?.firstElementChild;
				if (target) {
					target.remove();

					const img = document.createElement('img');
					img.src = app.icon;
					img.style.cssText = 'width:100%; height:100%; object-fit:contain;';
					clone.firstElementChild.appendChild(img);
				}

				clone.title = button_name;
				clone.id = button_name + '_app_page_button';

				parent2.parentElement.prepend(clone);

				clone.addEventListener('click', async () => {
					SyncLog('click button: ' + app.name);
					const app_path_s = await ResolveButtonPath(app.path_to_app, lastClickedElement, format_game_name);
					let result = await call_back(app_path_s);
				});

				spawnedAppPageButtonsCount = spawnedAppPageButtonsCount + 1;
				SyncLog('added node in app page ' + lastClickedElement + ': ' + button_name + ', number: ' + spawnedAppPageButtonsCount);
			});
		});
	}
	catch (error){
		SyncLog(error);
	}
}

//#endregion

//#region SpawnPropertiesMenuButtons

async function SpawnPropertiesMenuButtons(popup: any) {
	if (!popup) return;

	const game_properties_menu_buttons = global_object_settings.game_properties_menu_buttons.filter(IsButtonEnabled);

	if (game_properties_menu_buttons.length <= 0) return;

	let mainPanel = await WaitForElement('div.PageListColumn', popup.m_popup.document);

	if (mainPanel == null || mainPanel == undefined) return;

	SyncLog('start clone node in Properties Menu');

	let element = mainPanel.children[1].children[1];

	if (
		!element.id.includes('general') &&
		!element.id.includes('updates') &&
		!element.id.includes('localfiles') &&
		!element.id.includes('shortcut') &&
		!element.id.includes('controller') &&
		!element.id.includes('gamerecording') &&
		!element.id.includes('customization')
	) {
		return;
	}

	game_properties_menu_buttons.forEach((app: any) => {
		let myButton = element.cloneNode(true);

		SetButtonText(
			myButton,
			app.name,
			popup.m_strTitle,
			app.format_game_name == 'true',
			app.add_arrow_icon == 'true' ? ' ↗' : '',
		);

		myButton.addEventListener('click', async () => {
			SyncLog('click button: ' + app.name);
			const app_path_s = await ResolveButtonPath(app.path_to_app, popup.m_strTitle, app.format_game_name == 'true');
			let result = await call_back(app_path_s);
		});

		mainPanel.children[1].appendChild(myButton);
		SyncLog('added node in Properties Menu');
	});
}

//#endregion

//#region SpawnStoreSupernavButtons

const STORE_SUPERNAV_BUTTON_ID_PREFIX = 'millennium-custom-buttons-store-supernav-button-';

async function SpawnStoreSupernavButtons(popup: any, object_settings: any) {
	if (!popup) return;

	if (object_settings.store_supernav_buttons.filter(IsButtonEnabled).length <= 0) return;

	if (areStoreSupernavButtonsAlive(popup)) return;

	SyncLog('start clone node in Store Supernav Menu');

	const anyItem = await WaitForElement('div.contextMenuItem', popup.m_popup.document);

	object_settings.store_supernav_buttons.forEach((app: any, index: number) => {
		if (!IsButtonEnabled(app)) return;

		const id = STORE_SUPERNAV_BUTTON_ID_PREFIX + index;

		if (popup.m_popup.document.getElementById(id)) return;

		let myButton = anyItem.cloneNode(true);

		myButton.textContent = app.name + (app.add_arrow_icon == 'true' ? ' ↗' : '');
		(myButton as HTMLElement).id = id;

		myButton.addEventListener('click', async () => {
			let result = await call_back(app.path_to_app);
		});

		anyItem.parentNode.appendChild(myButton);
		spawned_store_supernav_buttons_to_delete_on_respawn.push(myButton);
		SyncLog('added node in Store Supernav Menu');
	});
}

function areStoreSupernavButtonsAlive(popup: any): boolean {
	return global_object_settings.store_supernav_buttons.every((app: any, index: number) => {
		if (!IsButtonEnabled(app)) return true;

		return popup.m_popup.document.getElementById(
			STORE_SUPERNAV_BUTTON_ID_PREFIX + index
		);
	});
}

//#endregion

let lastPage = '';

async function SubscribeOnMutations(popup: any) {
	Millennium.AddWindowCreateHook?.((context: any) => {
		if (!context.m_strName?.startsWith('SP ')) 
			return;

		const doc = context.m_popup?.document;

		if (!doc?.body) 
			return;

		const popup_target = context.m_popup.document.getElementById('popup_target');

		if (context.m_strName === 'SP Desktop_uid0'
			&& popup_target != null 
			&& popup_target != undefined)
		{
			popup_target.addEventListener('mousedown', (e) => {
				try {
					const x = e.clientX;
					const y = e.clientY;

					const draggables = popup_target.querySelectorAll('[draggable="true"]');

					for (const el of draggables) {
						const rect = el.getBoundingClientRect();
						if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
							const spanText = el.querySelector('span')?.innerText?.trim();
							const secondChildText = el.children?.[1]?.textContent?.trim();
							window.lastClickedElement = spanText || secondChildText || 'name not found';
						}
					}
				} catch (error) {}
			});
		}
	});

	if (!popup) return;

	const container = popup.m_popup.document.getElementById('popup_target');

	popup.m_popup.document.addEventListener('mousemove', (e) => {
		window.mouseX = e.clientX;
		window.mouseY = e.clientY;
	});

	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach((node) => {
					try {
						let NeedToAddConextMenuButtons = false;
						let NeedToAddAppPageButtons = false;

						let elementPossiblePlayButton = node.children[0].children[0];

						let elementsToSpawnAppPageButtons = [];

						if (node
							&& window.MainWindowBrowserManager?.m_lastLocation?.pathname
							&& window.MainWindowBrowserManager?.m_lastLocation?.pathname.match(/\/app\/(\d+)/)
						) {
							const elements = node.querySelectorAll('.SVGIcon_Settings');

							if (elements.length > 0) {
								NeedToAddAppPageButtons = true;
								elementsToSpawnAppPageButtons = elements;
							}
						}

						if (lastPage != window.MainWindowBrowserManager?.m_lastLocation?.pathname)
						{
							spawnedAppPageButtonsCount = 0;
						}

						lastPage = window.MainWindowBrowserManager?.m_lastLocation?.pathname;

						if (
							(
								elementPossiblePlayButton.className.includes('Play') ||
								elementPossiblePlayButton.className.includes('Stop') ||
								elementPossiblePlayButton.className.includes('Install') ||
								elementPossiblePlayButton.className.includes('Launch') ||
								elementPossiblePlayButton.className.includes('Update') ||
								elementPossiblePlayButton.className.includes('Cancel') ||
								elementPossiblePlayButton.className.includes('Download') ||
								elementPossiblePlayButton.className.includes('Pause') ||
								elementPossiblePlayButton.className.includes('Resume')
							)
							&& elementPossiblePlayButton.className.includes('Installed') == false
						) {
							NeedToAddConextMenuButtons = true;
						}

						if (window.lastClickedElement == '') 
							return;

						if (NeedToAddAppPageButtons){
							SpawnAppPageButtons(elementsToSpawnAppPageButtons, window.lastClickedElement);
						}

						if (NeedToAddConextMenuButtons){
							SpawnContextMenuButtons(popup, node, window.lastClickedElement);
						}
					} catch (error) {}
				});
			}
		}
	});

	observer.observe(container, {
		childList: true,
		subtree: true,
	});
}

async function OnPopupCreation(popup: any) {
	if (popup.m_strName === 'SP Desktop_uid0') {
		SyncLog('OnPopupCreation SP Desktop_uid0');
		popup_desktop = popup;
		SubscribeOnMutations(popup_desktop);
		RespawnTopButtons();
	}
	if (popup.m_strTitle === 'Store Supernav') {
		SyncLog('OnPopupCreation Store Supernav');
		popup_store_supernav = popup;
		RespawnStoreSupernavButtons();
	}

	SpawnPropertiesMenuButtons(popup);
}

//#region Settings

	type TopButtonSetting = {
		enabled: string;
		name: string;
		show_name: string;
		icon: string;
		show_icon: string;
		path_to_app: string;
	};

	type GenericButtonSetting = {
		enabled: string;
		name: string;
		format_game_name: string;
		add_arrow_icon: string;
		path_to_app: string;
	};

	type StoreSupernavButtonSetting = {
		enabled: string;
		name: string;
		add_arrow_icon: string;
		path_to_app: string;
	};

	type AppPageButtonSetting = {
		enabled: string;
		name: string;
		icon: string;
		format_game_name: string;
		path_to_app: string;
	};

	type SaveSnapshot = {
		language: string;
		topButtons: TopButtonSetting[];
		rightClickButtons: GenericButtonSetting[];
		dropDownItems: GenericButtonSetting[];
		gamePropertiesButtons: GenericButtonSetting[];
		storeSupernavButtons: StoreSupernavButtonSetting[];
		appPageButtons: AppPageButtonSetting[];
		dropDownName: string;
		dropDownAppendAfter: string;
		topButtonsStyle: string;
	};

	const buttonBackgroundStyle = {
		backgroundColor: '#21282f',
		padding: '7px',
		borderRadius: '8px',
		marginBottom: '10px',
	};

	// The theme's line-height assumes a single line, which leaves a large gap when
	// these labels wrap onto two lines.
	const actionButtonStyle = {
		width: '100%',
		lineHeight: '1.2',
	};

	function getSettingsDocument() {
		return popup_desktop?.m_popup?.document ?? document;
	}

	function getInputFromContainer(containerId: string): HTMLInputElement | null {
		const element = getSettingsDocument().getElementById(containerId);
		if (!element) return null;
		return element.querySelector('input');
	}

	function setTextFieldValue(containerId: string, value: string) {
		const input = getInputFromContainer(containerId);
		if (input) {
			input.value = value ?? '';
		}
	}

	function setToggleValue(containerId: string, value: string) {
		const input = getInputFromContainer(containerId);
		if (input) {
			input.checked = value === 'true';
		}
	}

	function getTextFieldValue(containerId: string, fallback: string = '') {
		const input = getInputFromContainer(containerId);
		return input ? input.value : fallback;
	}

	function getToggleValue(containerId: string, fallback: string = 'false') {
		const input = getInputFromContainer(containerId);
		return input ? input.checked.toString() : fallback;
	}

	function getTextAreaValue(elementId: string, fallback: string = '') {
		const element = getSettingsDocument().getElementById(elementId) as HTMLTextAreaElement | null;
		return element ? element.value : fallback;
	}

	function TrySetupSettings(settingsSnapshot: any) {
		settingsSnapshot.top_buttons.forEach((app: TopButtonSetting, index: number) => {
			setToggleValue(`top_buttons_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`top_buttons_name_${index}`, app.name);
			setToggleValue(`top_buttons_show_name_${index}`, app.show_name);
			setTextFieldValue(`top_buttons_icon_${index}`, app.icon);
			setToggleValue(`top_buttons_show_icon_${index}`, app.show_icon);
			setTextFieldValue(`top_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.right_click_on_game_context_menu_buttons.forEach((app: GenericButtonSetting, index: number) => {
			setToggleValue(`right_click_on_game_context_menu_buttons_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, app.name);
			setToggleValue(`right_click_on_game_context_menu_buttons_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, app.path_to_app);
		});

		setTextFieldValue('drop_down_name_field', settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.name);
		setTextFieldValue('drop_down_append_after_field', settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);

		settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.items.forEach((app: GenericButtonSetting, index: number) => {
			setToggleValue(`right_click_on_game_context_menu_buttons_drop_down_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, app.name);
			setToggleValue(`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.game_properties_menu_buttons.forEach((app: GenericButtonSetting, index: number) => {
			setToggleValue(`game_properties_menu_buttons_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`game_properties_menu_buttons_name_${index}`, app.name);
			setToggleValue(`game_properties_menu_buttons_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`game_properties_menu_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.store_supernav_buttons.forEach((app: StoreSupernavButtonSetting, index: number) => {
			setToggleValue(`store_supernav_buttons_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`store_supernav_buttons_name_${index}`, app.name);
			setToggleValue(`store_supernav_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.app_page_buttons.forEach((app: AppPageButtonSetting, index: number) => {
			setToggleValue(`app_page_buttons_enabled_${index}`, app.enabled ?? 'true');
			setTextFieldValue(`app_page_buttons_name_${index}`, app.name);
			setTextFieldValue(`app_page_buttons_icon_${index}`, app.icon);
			setToggleValue(`app_page_buttons_format_game_name_${index}`, app.format_game_name);
			setTextFieldValue(`app_page_buttons_path_to_app_${index}`, app.path_to_app);
		});

		const topButtonsStyleInput = getSettingsDocument().getElementById('TopButtonsStyleInput') as HTMLTextAreaElement | null;
		if (topButtonsStyleInput) {
			topButtonsStyleInput.value = settingsSnapshot.top_buttons_style;
		}
	}

	const createDefaultTopButton = (): TopButtonSetting => ({
		enabled: 'true',
		name: 'Steam',
		show_name: 'true',
		icon: 'https://raw.githubusercontent.com/diemonic1/Custom-buttons/refs/heads/main/PUBLIC_ICONS/steam.png',
		show_icon: 'true',
		path_to_app: 'https://store.steampowered.com/',
	});

	const createDefaultGenericButton = (): GenericButtonSetting => ({
		enabled: 'true',
		name: 'SteamGridDB',
		format_game_name: 'true',
		add_arrow_icon: 'true',
		path_to_app: 'https://www.steamgriddb.com/search/grids?term=%GAME_NAME%',
	});

	const createDefaultStoreSupernavButton = (): StoreSupernavButtonSetting => ({
		enabled: 'true',
		name: 'Steam Sales',
		add_arrow_icon: 'true',
		path_to_app: 'https://steamdb.info/sales/history/',
	});

	const createDefaultAppPageButton = (): AppPageButtonSetting => ({
		enabled: 'true',
		name: 'Nexus Mods',
		icon: 'https://raw.githubusercontent.com/diemonic1/Custom-buttons/refs/heads/main/PUBLIC_ICONS/nexusMods.png',
		format_game_name: 'true',
		path_to_app: 'https://www.nexusmods.com/games?keyword=%GAME_NAME%&sort=downloads',
	});

	const SettingsContent = () => {
		const initialSettings = global_object_settings as any;
		const [importErrorMessage, setImportErrorMessage] = useState('');
	  	const [language, setLanguage] = useState(getSettings().language ?? 'English');
		const [topButtons, setTopButtons] = useState<TopButtonSetting[]>(() => [...(initialSettings.top_buttons ?? [])]);
		const [rightClickButtons, setRightClickButtons] = useState<GenericButtonSetting[]>(() => [...(initialSettings.right_click_on_game_context_menu_buttons ?? [])]);
		const [dropDownItems, setDropDownItems] = useState<GenericButtonSetting[]>(() => [...(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.items ?? [])]);
		const [gamePropertiesButtons, setGamePropertiesButtons] = useState<GenericButtonSetting[]>(() => [...(initialSettings.game_properties_menu_buttons ?? [])]);
		const [storeSupernavButtons, setStoreSupernavButtons] = useState<StoreSupernavButtonSetting[]>(() => [...(initialSettings.store_supernav_buttons ?? [])]);
		const [appPageButtons, setAppPageButtons] = useState<AppPageButtonSetting[]>(() => [...(initialSettings.app_page_buttons ?? [])]);
		const [dropDownName, setDropDownName] = useState(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.name ?? 'Additional');
		const [dropDownAppendAfter, setDropDownAppendAfter] = useState(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.append_after_element_number ?? '1');
		const [topButtonsStyle, setTopButtonsStyle] = useState(initialSettings.top_buttons_style ?? '');
		const [openSections, setOpenSections] = useState<Record<string, boolean>>({
			rightClick: false,
			dropDown: false,
			gameProperties: false,
			topButtons: false,
			storeSupernav: false,
			appPage: false,
		});

		const languageOptions = GetLanguageOptions();
		const selectedlanguageOption =
			languageOptions.find((option) => option.data === language) ?? languageOptions[0];

		const replaceGameNameParameter = (text: string) =>
			text.split('%GAME_NAME%').join(GAME_NAME_PARAMETER);

		const GAME_NAME_PARAMETER_TIP = replaceGameNameParameter(Localize(language, 'GameNameParameterTip'));
		const GAME_ID_PARAMETER_TIP = Localize(language, 'GameIdParameterTip');

		// The asterisk marks the sections where both parameters work, so its tooltip carries both.
		const PARAMETERS_TIP = GAME_NAME_PARAMETER_TIP + '\n\n' + GAME_ID_PARAMETER_TIP;
		const ENABLE_BUTTON_TIP = Localize(language, 'EnableButtonTip');
		const BUTTON_NAME_TIP = Localize(language, 'ButtonNameTip');
		const BUTTON_SHOW_NAME_TIP = Localize(language, 'ButtonShowNameTip');
		const BUTTON_ICON_TIP = Localize(language, 'ButtonIconTip');
		const BUTTON_SHOW_ICON_TIP = Localize(language, 'ButtonShowIconTip');
		const BUTTON_PATH_TO_APP_TIP = Localize(language, 'ButtonPathToAppTip');
		const BUTTON_FORMAT_GAME_NAME_TIP = replaceGameNameParameter(Localize(language, 'ButtonFormatGameNameTip'));
		const BUTTON_ADD_ARROW_ICON_TIP = Localize(language, 'ButtonAddArrowIconTip');
		const DROPDOWN_MENU_SETTINGS = Localize(language, 'DropdownMenuSettings');

		const renderSectionHeader = (titleKey: string, sectionKey: string, addTooltipKey: string, onAdd: () => void, showAsterisk: boolean = true) => (
			<>
				<div title={Localize(language, addTooltipKey)}>
					<Button style={{ width: '100%', marginBottom: '8px', background: '#d29cffff', color: '#1c1f23', border: '0px', borderRadius: '6px', boxShadow: 'none', fontWeight: 'bold' }} onClick={onAdd}>
						{Localize(language, 'Add Button')} +
					</Button>
				</div>
				<div
					style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
					onClick={() => toggleSection(sectionKey)}
				>
					<span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: openSections[sectionKey] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
					<h3 style={{ margin: 0 }} title={showAsterisk ? PARAMETERS_TIP : undefined}>
						{Localize(language, titleKey)} {showAsterisk && <span style={{ color: YELLOW_HIGHLIGHT_COLOR }}>*</span>}
					</h3>
				</div>
			</>
		);

		// Steam's own confirmation dialog, used for everything destructive.
		// The parent window has to be passed explicitly. Without it showModal falls
		// back to findSP(), which throws in this context, so the dialog never appears.
		const confirmAction = (titleKey: string, description: string, onConfirm: () => void) => {
			const settings_window = getSettingsDocument().defaultView ?? window;

			try {
				showModal(
					<ConfirmModal
						strTitle={Localize(language, titleKey)}
						strDescription={description}
						strOKButtonText={Localize(language, 'Confirm')}
						strCancelButtonText={Localize(language, 'Cancel')}
						bDestructiveWarning={true}
						onOK={onConfirm}
					/>,
					settings_window,
					{ strTitle: Localize(language, titleKey), bNeverPopOut: true },
				);
			} catch (error) {
				// Nothing is done without confirmation, so a broken dialog must not delete anything.
				print_error({ text: 'failed to show confirmation dialog: ' + error });
				settings_window.console?.error('[Custom-buttons] failed to show confirmation dialog', error);
			}
		};

		// The name is read from the field rather than from the state, so the dialog
		// shows what the user currently sees even if the edit is not saved yet.
		const renderDeleteButton = (nameFieldId: string, fallbackName: string, index: number, onDelete: () => void) => (
			<div style={{ textAlign: 'center' }}>
				<button
					style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
					onClick={() => {
						const current_name = getTextFieldValue(nameFieldId, fallbackName).trim();
						const description = Localize(language, 'ConfirmDeleteButtonDescription')
							.split('%BUTTON_NUMBER%').join(String(index + 1))
							.split('%BUTTON_NAME%').join(current_name !== '' ? current_name : EMPTY_NAME_PLACEHOLDER);

						confirmAction('ConfirmDeleteButtonTitle', description, onDelete);
					}}
				>
					{Localize(language, 'delete this button')}
				</button>
			</div>
		);

		const preserveStaticFields = () => {
			setDropDownName(getTextFieldValue('drop_down_name_field', dropDownName));
			setDropDownAppendAfter(getTextFieldValue('drop_down_append_after_field', dropDownAppendAfter));
			setTopButtonsStyle(getTextAreaValue('TopButtonsStyleInput', topButtonsStyle));
		};

		const readTopButtonsFromDom = (): TopButtonSetting[] => {
			return topButtons.map((item, index) => ({
				enabled: getToggleValue(`top_buttons_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`top_buttons_name_${index}`, item.name),
				show_name: getToggleValue(`top_buttons_show_name_${index}`, item.show_name),
				icon: getTextFieldValue(`top_buttons_icon_${index}`, item.icon),
				show_icon: getToggleValue(`top_buttons_show_icon_${index}`, item.show_icon),
				path_to_app: getTextFieldValue(`top_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readRightClickButtonsFromDom = (): GenericButtonSetting[] => {
			return rightClickButtons.map((item, index) => ({
				enabled: getToggleValue(`right_click_on_game_context_menu_buttons_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, item.name),
				format_game_name: getToggleValue(`right_click_on_game_context_menu_buttons_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readDropDownItemsFromDom = (): GenericButtonSetting[] => {
			return dropDownItems.map((item, index) => ({
				enabled: getToggleValue(`right_click_on_game_context_menu_buttons_drop_down_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, item.name),
				format_game_name: getToggleValue(`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readGamePropertiesButtonsFromDom = (): GenericButtonSetting[] => {
			return gamePropertiesButtons.map((item, index) => ({
				enabled: getToggleValue(`game_properties_menu_buttons_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`game_properties_menu_buttons_name_${index}`, item.name),
				format_game_name: getToggleValue(`game_properties_menu_buttons_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`game_properties_menu_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readStoreSupernavButtonsFromDom = (): StoreSupernavButtonSetting[] => {
			return storeSupernavButtons.map((item, index) => ({
				enabled: getToggleValue(`store_supernav_buttons_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`store_supernav_buttons_name_${index}`, item.name),
				add_arrow_icon: getToggleValue(`store_supernav_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readAppPageButtonsFromDom = (): AppPageButtonSetting[] => {
			return appPageButtons.map((item, index) => ({
				enabled: getToggleValue(`app_page_buttons_enabled_${index}`, item.enabled ?? 'true'),
				name: getTextFieldValue(`app_page_buttons_name_${index}`, item.name),
				icon: getTextFieldValue(`app_page_buttons_icon_${index}`, item.icon),
				format_game_name: getToggleValue(`app_page_buttons_format_game_name_${index}`, item.format_game_name),
				path_to_app: getTextFieldValue(`app_page_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const snapshotRef = useRef<() => SaveSnapshot>();
		const autoSaveTimeoutRef = useRef<any>(undefined);

		snapshotRef.current = () => ({
			language: language,
			topButtons: topButtons,
			rightClickButtons: rightClickButtons,
			dropDownItems: dropDownItems,
			gamePropertiesButtons: gamePropertiesButtons,
			storeSupernavButtons: storeSupernavButtons,
			appPageButtons: appPageButtons,
			dropDownName: dropDownName,
			dropDownAppendAfter: dropDownAppendAfter,
			topButtonsStyle: topButtonsStyle,
		});

		const cancelPendingAutoSave = () => {
			if (!autoSaveTimeoutRef.current) return;

			clearTimeout(autoSaveTimeoutRef.current);
			autoSaveTimeoutRef.current = undefined;
		};

		// Everything is saved automatically, so these functions only ever touch refs
		// and never rewrite the fields the user is currently typing in.
		const scheduleAutoSave = () => {
			cancelPendingAutoSave();

			autoSaveTimeoutRef.current = setTimeout(() => {
				autoSaveTimeoutRef.current = undefined;

				const snapshot = snapshotRef.current?.();
				if (!snapshot) return;

				PersistSettings(snapshot);
				ScheduleRespawnButtons();
			}, AUTO_SAVE_DELAY);
		};

		// Fields of a collapsed section are not in the DOM anymore, so their current
		// values have to be moved into the state before the section is closed.
		const flushDomIntoState = () => {
			preserveStaticFields();
			setTopButtons(readTopButtonsFromDom());
			setRightClickButtons(readRightClickButtonsFromDom());
			setDropDownItems(readDropDownItemsFromDom());
			setGamePropertiesButtons(readGamePropertiesButtonsFromDom());
			setStoreSupernavButtons(readStoreSupernavButtonsFromDom());
			setAppPageButtons(readAppPageButtonsFromDom());
		};

		const toggleSection = (key: string) => {
			flushDomIntoState();
			setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
		};

		const applySettingsObject = (settings: any) => {
			setTopButtons([...settings.top_buttons]);
			setRightClickButtons([...settings.right_click_on_game_context_menu_buttons]);
			setDropDownItems([...settings.right_click_on_game_context_menu_buttons_drop_down.items]);
			setDropDownName(settings.right_click_on_game_context_menu_buttons_drop_down.name);
			setDropDownAppendAfter(settings.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);
			setGamePropertiesButtons([...settings.game_properties_menu_buttons]);
			setStoreSupernavButtons([...settings.store_supernav_buttons]);
			setAppPageButtons([...settings.app_page_buttons]);
			setTopButtonsStyle(settings.top_buttons_style);
		};

		const onImportSettings = async () => {
			setImportErrorMessage('');

			const imported_settings = await ImportSettingsFromFile();

			if (!imported_settings) {
				setImportErrorMessage(Localize(language, 'ImportSettingsError'));
				return;
			}

			confirmAction('ConfirmImportSettingsTitle', Localize(language, 'ConfirmImportSettingsDescription'), () => {
				applySettingsObject(imported_settings);
			});
		};

		const onExportSettings = () => {
			const snapshot = snapshotRef.current?.();
			if (!snapshot) return;

			ExportSettingsToFile(snapshot);
		};

		const onResetSettings = () => {
			confirmAction('ConfirmResetSettingsTitle', Localize(language, 'ConfirmResetSettingsDescription'), () => {
				setImportErrorMessage('');

				const default_settings = NormalizeSettingsObject(JSON.parse(DEFAULT_SETTINGS_JSON));
				if (!default_settings) return;

				applySettingsObject(default_settings);
			});
		};

		useEffect(() => {
			const settings_document = getSettingsDocument();
			const onSettingsChanged = () => scheduleAutoSave();

			settings_document.addEventListener('input', onSettingsChanged, true);
			settings_document.addEventListener('change', onSettingsChanged, true);

			return () => {
				settings_document.removeEventListener('input', onSettingsChanged, true);
				settings_document.removeEventListener('change', onSettingsChanged, true);
				cancelPendingAutoSave();
			};
		}, []);

		useEffect(() => {
			// A pending save must not read fields that are being mounted right now.
			cancelPendingAutoSave();

			const snapshot = {
				top_buttons: topButtons,
				right_click_on_game_context_menu_buttons: rightClickButtons,
				right_click_on_game_context_menu_buttons_drop_down: {
					name: dropDownName,
					append_after_element_number: dropDownAppendAfter,
					items: dropDownItems,
				},
				game_properties_menu_buttons: gamePropertiesButtons,
				store_supernav_buttons: storeSupernavButtons,
				app_page_buttons: appPageButtons,
				top_buttons_style: topButtonsStyle,
			};

			setTimeout(() => {
				TrySetupSettings(snapshot);
				scheduleAutoSave();
			}, 50);
		}, [
			language,
			topButtons,
			rightClickButtons,
			dropDownItems,
			gamePropertiesButtons,
			storeSupernavButtons,
			appPageButtons,
			dropDownName,
			dropDownAppendAfter,
			topButtonsStyle,
			openSections,
		]);

		return (
			<>
				<div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
					<div style={{ flex: 1 }} title={Localize(language, 'ImportSettingsTip')}>
						<DialogButtonPrimary style={actionButtonStyle} onClick={onImportSettings}>
							{Localize(language, 'ImportSettings')}
						</DialogButtonPrimary>
					</div>
					<div style={{ flex: 1 }} title={Localize(language, 'ExportSettingsTip')}>
						<DialogButtonPrimary style={actionButtonStyle} onClick={onExportSettings}>
							{Localize(language, 'ExportSettings')}
						</DialogButtonPrimary>
					</div>
					<div style={{ flex: 1 }} title={Localize(language, 'ResetSettingsTip')}>
						<DialogButtonPrimary style={actionButtonStyle} onClick={onResetSettings}>
							{Localize(language, 'ResetSettings')}
						</DialogButtonPrimary>
					</div>
				</div>

				{importErrorMessage != '' && (
					<div style={{ margin: '6px 0px', padding: '6px', borderRadius: '6px', backgroundColor: '#ff8e8e', color: '#000' }}>
						{importErrorMessage}
					</div>
				)}

				<PanelSection title={Localize(language, 'LanguageOfPlugin')}>
					<DropdownItem
						label={selectedlanguageOption.label}
						bottomSeparator="standard"
						rgOptions={languageOptions}
						selectedOption={selectedlanguageOption}
						menuLabel={selectedlanguageOption.label}
						strDefaultLabel={selectedlanguageOption.label}
						onChange={(selected) => setLanguage(String(selected.data))}
					/>
				</PanelSection>

				<p style={{ opacity: 0.7 }}>{Localize(language, 'SettingsAreSavedAutomatically')}</p>

				<p>{GAME_NAME_PARAMETER_TIP}</p>

				<p>{GAME_ID_PARAMETER_TIP}</p>

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(255, 202, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('Right click on game context menu buttons', 'rightClick', 'Add right click on game context menu button', () => {
						preserveStaticFields();
						setRightClickButtons([...readRightClickButtonsFromDom(), createDefaultGenericButton()]);
					})}

					{openSections.rightClick && rightClickButtons.map((item, index) => (
						<div key={`right-click-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'Right click on game context menu buttons')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`right_click_on_game_context_menu_buttons_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setRightClickButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`right_click_on_game_context_menu_buttons_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label={Localize(language, 'FormatGameName')}>
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setRightClickButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label={Localize(language, 'AddArrowIcon')}>
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setRightClickButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`right_click_on_game_context_menu_buttons_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readRightClickButtonsFromDom();
								current.splice(index, 1);
								setRightClickButtons(current);
							})}
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(255, 0, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('Right click on game context menu buttons in drop down', 'dropDown', 'Add right click on game context menu button in drop down', () => {
						preserveStaticFields();
						setDropDownItems([...readDropDownItemsFromDom(), createDefaultGenericButton()]);
					})}

					{openSections.dropDown && <>
					{dropDownItems.map((item, index) => (
						<div key={`drop-down-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'Right click on game context menu buttons in drop down')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`right_click_on_game_context_menu_buttons_drop_down_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setDropDownItems((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`right_click_on_game_context_menu_buttons_drop_down_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label={Localize(language, 'FormatGameName')}>
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setDropDownItems((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>							
								<Field label={Localize(language, 'AddArrowIcon')}>
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setDropDownItems((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readDropDownItemsFromDom();
								current.splice(index, 1);
								setDropDownItems(current);
							})}
						</div>
					))}

					<PanelSection title={DROPDOWN_MENU_SETTINGS}>
						<div id="drop_down_name_field">
							<TextField label={Localize(language, 'Name')} description={Localize(language, "Name for the drop-down menu section")} />
						</div>
						<div id="drop_down_append_after_field">
							<TextField
								label={Localize(language, 'Append after')}
								description={Localize(language, "After which element should the menu be inserted")}
								mustBeNumeric={true}
								rangeMin={1}
								rangeMax={7}
							/>
						</div>
					</PanelSection>
					</>}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(61, 255, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('Game properties menu buttons', 'gameProperties', 'Add game properties menu buttons', () => {
						preserveStaticFields();
						setGamePropertiesButtons([...readGamePropertiesButtonsFromDom(), createDefaultGenericButton()]);
					})}

					{openSections.gameProperties && gamePropertiesButtons.map((item, index) => (
						<div key={`game-properties-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'Game properties menu buttons')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`game_properties_menu_buttons_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setGamePropertiesButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`game_properties_menu_buttons_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label={Localize(language, 'FormatGameName')}>
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setGamePropertiesButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label={Localize(language, 'AddArrowIcon')}>
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setGamePropertiesButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`game_properties_menu_buttons_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readGamePropertiesButtonsFromDom();
								current.splice(index, 1);
								setGamePropertiesButtons(current);
							})}
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(0, 255, 202, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('Top Buttons', 'topButtons', 'Add top button', () => {
						preserveStaticFields();
						setTopButtons([...readTopButtonsFromDom(), createDefaultTopButton()]);
					}, false)}

					{openSections.topButtons && topButtons.map((item, index) => (
						<div key={`top-buttons-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'Top Buttons')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`top_buttons_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setTopButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`top_buttons_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_show_name_${index}`} title={BUTTON_SHOW_NAME_TIP}>
								<Field label={Localize(language, 'Show name')}>
									<Toggle
										value={item.show_name === 'true'}
										onChange={(checked) => {
											setTopButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, show_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_icon_${index}`}>
								<TextField label={Localize(language, 'Icon')} description={BUTTON_ICON_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_show_icon_${index}`} title={BUTTON_SHOW_ICON_TIP}>
								<Field label={Localize(language, 'Show icon')}>
									<Toggle
										value={item.show_icon === 'true'}
										onChange={(checked) => {
											setTopButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, show_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`top_buttons_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readTopButtonsFromDom();
								current.splice(index, 1);
								setTopButtons(current);
							})}
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(230, 0, 255, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('Store supernav buttons', 'storeSupernav', 'Add store supernav buttons', () => {
						preserveStaticFields();
						setStoreSupernavButtons([...readStoreSupernavButtonsFromDom(), createDefaultStoreSupernavButton()]);
					}, false)}

					{openSections.storeSupernav && storeSupernavButtons.map((item, index) => (
						<div key={`store-supernav-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'Store supernav buttons')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`store_supernav_buttons_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setStoreSupernavButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`store_supernav_buttons_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`store_supernav_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label={Localize(language, 'AddArrowIcon')}>
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setStoreSupernavButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`store_supernav_buttons_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`store_supernav_buttons_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readStoreSupernavButtonsFromDom();
								current.splice(index, 1);
								setStoreSupernavButtons(current);
							})}
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(0, 123, 255, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					{renderSectionHeader('App page Buttons', 'appPage', 'Add app page button', () => {
						preserveStaticFields();
						setAppPageButtons([...readAppPageButtonsFromDom(), createDefaultAppPageButton()]);
					})}

					{openSections.appPage && appPageButtons.map((item, index) => (
						<div key={`app-page-${index}`} style={buttonBackgroundStyle}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
								<div title={Localize(language, 'App page Buttons')}>{Localize(language, 'Button Number')}: {index + 1}</div>
								<div id={`app_page_buttons_enabled_${index}`} title={ENABLE_BUTTON_TIP}>
									<Toggle
										value={item.enabled !== 'false'}
										onChange={(checked) => {
											setAppPageButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, enabled: checked.toString() } : curr));
										}}
									/>
								</div>
							</div>
							<div id={`app_page_buttons_name_${index}`}>
								<TextField label={Localize(language, 'Name')} description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_icon_${index}`}>
								<TextField label={Localize(language, 'Icon')} description={BUTTON_ICON_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label={Localize(language, 'FormatGameName')}>
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setAppPageButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_path_to_app_${index}`}>
								<TextField label={Localize(language, 'URL or App Path')} description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							{renderDeleteButton(`app_page_buttons_name_${index}`, item.name, index, () => {
								preserveStaticFields();
								const current = readAppPageButtonsFromDom();
								current.splice(index, 1);
								setAppPageButtons(current);
							})}
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<h2 style={{ margin: '0px' }}>{Localize(language, 'Top Buttons style')}</h2>
				<p>
					{Localize(language, 'Top Buttons style changer description')}
				</p>
				<textarea 
					id="TopButtonsStyleInput" 
					style={{ 
						width: '94%', 
						minHeight: '150px', 
						padding: '4px 8px', 
						fontSize: '12px',
						backgroundColor: '#2e343b',
						borderRadius: '6px',
						border: '0px',
						color: '#ffffff',
						resize: 'none'
					}}>
				</textarea>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<PanelSection title={Localize(language, 'GameIdCache')}>
					<div title={Localize(language, 'ClearGameIdCacheTip')}>
						<DialogButtonPrimary style={actionButtonStyle} onClick={() => ClearGameIdCache()}>
							{Localize(language, 'ClearGameIdCache')}
						</DialogButtonPrimary>
					</div>
				</PanelSection>
			</>
		);
	};

// A button is never dropped when it is saved: empty fields get a readable placeholder instead.
function WithPlaceholder(value: string, placeholder: string) {
	return value === undefined || value === null || value.trim() === '' ? placeholder : value;
}

function BuildSettingsObject(snapshot: SaveSnapshot) {
	let result: any = {};

	let result_top_buttons: TopButtonSetting[] = [];
	for (let index = 0; index < snapshot.topButtons.length; index++) {
		result_top_buttons.push({
			enabled: snapshot.topButtons[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`top_buttons_name_${index}`, snapshot.topButtons[index].name), EMPTY_NAME_PLACEHOLDER),
			show_name: snapshot.topButtons[index].show_name,
			icon: getTextFieldValue(`top_buttons_icon_${index}`, snapshot.topButtons[index].icon),
			show_icon: snapshot.topButtons[index].show_icon,
			path_to_app: WithPlaceholder(getTextFieldValue(`top_buttons_path_to_app_${index}`, snapshot.topButtons[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}
	result['top_buttons'] = result_top_buttons;

	let result_right_click_on_game_context_menu_buttons: GenericButtonSetting[] = [];
	for (let index = 0; index < snapshot.rightClickButtons.length; index++) {
		result_right_click_on_game_context_menu_buttons.push({
			enabled: snapshot.rightClickButtons[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, snapshot.rightClickButtons[index].name), EMPTY_NAME_PLACEHOLDER),
			format_game_name: snapshot.rightClickButtons[index].format_game_name,
			add_arrow_icon: snapshot.rightClickButtons[index].add_arrow_icon,
			path_to_app: WithPlaceholder(getTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, snapshot.rightClickButtons[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}
	result['right_click_on_game_context_menu_buttons'] = result_right_click_on_game_context_menu_buttons;

	let result_right_click_on_game_context_menu_buttons_drop_down: GenericButtonSetting[] = [];
	for (let index = 0; index < snapshot.dropDownItems.length; index++) {
		result_right_click_on_game_context_menu_buttons_drop_down.push({
			enabled: snapshot.dropDownItems[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, snapshot.dropDownItems[index].name), EMPTY_NAME_PLACEHOLDER),
			format_game_name: snapshot.dropDownItems[index].format_game_name,
			add_arrow_icon: snapshot.dropDownItems[index].add_arrow_icon,
			path_to_app: WithPlaceholder(getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, snapshot.dropDownItems[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}

	result['right_click_on_game_context_menu_buttons_drop_down'] = {
		name: getTextFieldValue('drop_down_name_field', snapshot.dropDownName),
		append_after_element_number: getTextFieldValue('drop_down_append_after_field', snapshot.dropDownAppendAfter),
		items: result_right_click_on_game_context_menu_buttons_drop_down,
	};

	let result_game_properties_menu_buttons: GenericButtonSetting[] = [];
	for (let index = 0; index < snapshot.gamePropertiesButtons.length; index++) {
		result_game_properties_menu_buttons.push({
			enabled: snapshot.gamePropertiesButtons[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`game_properties_menu_buttons_name_${index}`, snapshot.gamePropertiesButtons[index].name), EMPTY_NAME_PLACEHOLDER),
			format_game_name: snapshot.gamePropertiesButtons[index].format_game_name,
			add_arrow_icon: snapshot.gamePropertiesButtons[index].add_arrow_icon,
			path_to_app: WithPlaceholder(getTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, snapshot.gamePropertiesButtons[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}
	result['game_properties_menu_buttons'] = result_game_properties_menu_buttons;

	let result_store_supernav_buttons: StoreSupernavButtonSetting[] = [];
	for (let index = 0; index < snapshot.storeSupernavButtons.length; index++) {
		result_store_supernav_buttons.push({
			enabled: snapshot.storeSupernavButtons[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`store_supernav_buttons_name_${index}`, snapshot.storeSupernavButtons[index].name), EMPTY_NAME_PLACEHOLDER),
			add_arrow_icon: snapshot.storeSupernavButtons[index].add_arrow_icon,
			path_to_app: WithPlaceholder(getTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, snapshot.storeSupernavButtons[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}
	result['store_supernav_buttons'] = result_store_supernav_buttons;

	let result_app_page_buttons: AppPageButtonSetting[] = [];
	for (let index = 0; index < snapshot.appPageButtons.length; index++) {
		result_app_page_buttons.push({
			enabled: snapshot.appPageButtons[index].enabled ?? 'true',
			name: WithPlaceholder(getTextFieldValue(`app_page_buttons_name_${index}`, snapshot.appPageButtons[index].name), EMPTY_NAME_PLACEHOLDER),
			icon: getTextFieldValue(`app_page_buttons_icon_${index}`, snapshot.appPageButtons[index].icon),
			format_game_name: snapshot.appPageButtons[index].format_game_name,
			path_to_app: WithPlaceholder(getTextFieldValue(`app_page_buttons_path_to_app_${index}`, snapshot.appPageButtons[index].path_to_app), EMPTY_PATH_PLACEHOLDER),
		});
	}
	result['app_page_buttons'] = result_app_page_buttons;

	result['top_buttons_style'] = getTextAreaValue('TopButtonsStyleInput', snapshot.topButtonsStyle);

	return result;
}

function PersistSettings(snapshot: SaveSnapshot) {
	try {
		const result = BuildSettingsObject(snapshot);

		saveSettings({ ...getSettings(), language: snapshot.language, settings_json: JSON.stringify(result) });
		global_object_settings = result;

		SyncLog('Settings saved');
		return result;
	} catch (error) {
		SyncLog('failed to save settings: ' + error);
		return undefined;
	}
}

let respawn_buttons_timeout: any = undefined;

// Respawning is slower than saving, so it is delayed a bit more than the auto save itself.
function ScheduleRespawnButtons() {
	if (respawn_buttons_timeout) clearTimeout(respawn_buttons_timeout);

	respawn_buttons_timeout = setTimeout(() => {
		respawn_buttons_timeout = undefined;
		RespawnTopButtons();
		RespawnStoreSupernavButtons();
	}, RESPAWN_BUTTONS_DELAY);
}

//#region Import / Export

function NormalizeSettingsObject(raw: any) {
	if (!raw || typeof raw !== 'object') return undefined;

	const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : raw;

	const has_any_section =
		Array.isArray(settings.top_buttons) ||
		Array.isArray(settings.right_click_on_game_context_menu_buttons) ||
		Array.isArray(settings.game_properties_menu_buttons) ||
		Array.isArray(settings.store_supernav_buttons) ||
		Array.isArray(settings.app_page_buttons) ||
		(settings.right_click_on_game_context_menu_buttons_drop_down
			&& typeof settings.right_click_on_game_context_menu_buttons_drop_down === 'object');

	if (!has_any_section) return undefined;

	const drop_down = settings.right_click_on_game_context_menu_buttons_drop_down ?? {};

	return {
		top_buttons: Array.isArray(settings.top_buttons) ? settings.top_buttons : [],
		right_click_on_game_context_menu_buttons: Array.isArray(settings.right_click_on_game_context_menu_buttons) ? settings.right_click_on_game_context_menu_buttons : [],
		right_click_on_game_context_menu_buttons_drop_down: {
			items: Array.isArray(drop_down.items) ? drop_down.items : [],
			name: drop_down.name ?? 'Other',
			append_after_element_number: drop_down.append_after_element_number ?? '1',
		},
		game_properties_menu_buttons: Array.isArray(settings.game_properties_menu_buttons) ? settings.game_properties_menu_buttons : [],
		store_supernav_buttons: Array.isArray(settings.store_supernav_buttons) ? settings.store_supernav_buttons : [],
		app_page_buttons: Array.isArray(settings.app_page_buttons) ? settings.app_page_buttons : [],
		top_buttons_style: typeof settings.top_buttons_style === 'string' ? settings.top_buttons_style : '',
	};
}

function GetSettingsBackupFileName() {
	const now = new Date();
	const pad = (value: number) => value.toString().padStart(2, '0');

	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

	return `Custom Buttons settings backup ${date} ${time}.json`;
}

function ExportSettingsToFile(snapshot: SaveSnapshot) {
	try {
		const file_content = JSON.stringify({
			plugin: 'Custom Buttons',
			exported_at: new Date().toISOString(),
			language: snapshot.language,
			settings: BuildSettingsObject(snapshot),
		}, null, 4);

		const settings_document = getSettingsDocument();
		const settings_window: any = settings_document.defaultView ?? window;

		const blob = new settings_window.Blob([file_content], { type: 'application/json' });
		const url = settings_window.URL.createObjectURL(blob);

		const link = settings_document.createElement('a');
		link.href = url;
		link.download = GetSettingsBackupFileName();
		link.style.display = 'none';

		settings_document.body.appendChild(link);
		link.click();
		link.remove();

		setTimeout(() => settings_window.URL.revokeObjectURL(url), 10000);

		SyncLog('Settings exported to ' + link.download);
	} catch (error) {
		SyncLog('failed to export settings: ' + error);
	}
}

function ImportSettingsFromFile(): Promise<any> {
	return new Promise((resolve) => {
		const settings_document = getSettingsDocument();

		const input = settings_document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json,.json';
		input.style.display = 'none';

		input.addEventListener('change', async () => {
			try {
				const file = input.files?.[0];

				if (!file) {
					resolve(undefined);
					return;
				}

				resolve(NormalizeSettingsObject(JSON.parse(await file.text())));
			} catch (error) {
				SyncLog('failed to import settings: ' + error);
				resolve(undefined);
			} finally {
				input.remove();
			}
		});

		settings_document.body.appendChild(input);
		input.click();
	});
}

//#endregion

//#endregion

export default definePlugin(() => {
	const settings = getSettings();
	global_object_settings = JSON.parse(settings.settings_json);

	LoadGameIdCache();

	Millennium.AddWindowCreateHook(OnPopupCreation);

	return {
		title: 'Custom Buttons',
		icon: <IconsModule.Settings />,
		content: <SettingsContent />,
	};
});

