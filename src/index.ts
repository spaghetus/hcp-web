import cbor from 'cbor';

interface HCPHeader {
	/// The identity scopes the server wants to receive.
	scopes: string[];
	/// The features the server supports.
	features: string[];
	/// The features the server requires.
	required: string[];
}

interface HCPResponse {
	/// The content of the response. Implies a VLayout.
	content: any[];
	/// Extra metadata included for use with new features.
	extra: Map<string, any>;
}

interface HCPRequest {
	/// The features the client would like to be taken into account for this request.
	features: string[];
	/// The identities the client is providing for this request.
	identities: Map<string, string>;
	/// Extra data for features.
	extra: Map<string, string>;
}

let pending_lives = [];

function loadPage(url: string) {
	console.log(url);
	const view = document.querySelector('#view');
	putPage(url, view);
}

document.querySelector('#go').addEventListener('click', () => {
	const url: string = (document.querySelector('#url') as HTMLInputElement).value;
	loadPage(url);
});

async function putPage(url: string, view: Element) {
	if (url.startsWith('/')) {
		let origin = (new URL((document.querySelector('#url') as HTMLInputElement).value)).origin
		url = origin + url
	}
	// Doesn't do much yet lol
	let header: HCPHeader = JSON.parse(await (await fetch(url)).text())
	// also a placeholder
	let request: HCPRequest = {
		features: [],
		identities: new Map(),
		extra: new Map()
	}
	let page: HCPResponse = await (await fetch(url, {
		method: "POST",
		body: JSON.stringify(request)
	})).json()
	console.log(header, request, page);
	let node = {
		VLayout: page.content
	};
	let rendered = renderNode(node);
	view.innerHTML = '';
	view.appendChild(rendered)
}

function renderNode(node: any): Element {
	if (Object.keys(node).length != 1) {
		let errorElement = document.createElement('span')
		errorElement.innerText = "???"
		return errorElement
	} else {
		console.log(node);
		switch (Object.keys(node)[0]) {
			case "VLayout":
				let vLayoutElement = document.createElement('div')
				node.VLayout.map(renderNode).forEach(element => {
					vLayoutElement.appendChild(element)
					vLayoutElement.appendChild(document.createElement('br'))
				})
				return vLayoutElement
			case "HLayout":
				let hLayoutElement = document.createElement('table')
				node.VLayout.map(renderNode).forEach(element => {
					let td = document.createElement('td')
					td.appendChild(element)
					hLayoutElement.appendChild(td)
				})
				return hLayoutElement
			case "InlineLayout":
				let ilLayoutElement = document.createElement('div')
				node.InlineLayout.map(renderNode).forEach(element => {
					ilLayoutElement.appendChild(element)
				})
				return ilLayoutElement
			case "Text":
				let textElement = document.createElement('span')
				textElement.innerText = node.Text
				return textElement
			case "Live":
				let [liveUrl, liveInterval] = node.Live
				let liveElement = document.createElement('div')
				liveElement.id = Math.random().toString()
				let liveUpdater = () => {
					console.log(liveElement.id);
					let me = document.getElementById(liveElement.id)
					if (me) {
						putPage(liveUrl, liveElement)
					}
				}
				pending_lives.push(setInterval(liveUpdater, liveInterval * 1000))
				setTimeout(liveUpdater, 0)
				return liveElement
			default:
				let unknownElement = document.createElement('span')
				unknownElement.innerText = "???"
				return unknownElement
		}
	}
}