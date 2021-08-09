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
			case "Text":
				let textElement = document.createElement('span')
				textElement.innerText = node.Text
				return textElement
			case "VLayout":
				let vLayoutElement = document.createElement('span')
				node.VLayout.map(renderNode).forEach(element => {
					vLayoutElement.appendChild(element)
					vLayoutElement.appendChild(document.createElement('br'))
				})
				vLayoutElement.removeChild(vLayoutElement.children[vLayoutElement.children.length-1])
				return vLayoutElement
			case "HLayout":
				let hLayoutElement = document.createElement('table')
				hLayoutElement.style.display = 'inline-block'
				hLayoutElement.classList.add('no-border')
				let hLayoutRow = document.createElement('tr')
				hLayoutElement.appendChild(hLayoutRow)
				node.HLayout.map(renderNode).forEach(element => {
					let td = document.createElement('td')
					td.appendChild(element)
					hLayoutRow.appendChild(td)
				})
				return hLayoutElement
			case "InlineLayout":
				let ilLayoutElement = document.createElement('span')
				node.InlineLayout.map(renderNode).forEach(element => {
					ilLayoutElement.appendChild(element)
				})
				return ilLayoutElement
			case "Table":
				let tableLayoutElement = document.createElement('table')
				tableLayoutElement.style.display = 'inline-block'
				node.Table.map((innerNode: any) => {
					if (innerNode.HLayout) {
						let row = document.createElement('tr')
						innerNode.HLayout.map(renderNode).forEach(element => {
							let td = document.createElement('td')
							td.appendChild(element)
							row.appendChild(td)
						})
						tableLayoutElement.appendChild(row)
					} else {
						console.error("Unexpected non-HLayout child of Table")
					}
				})
				return tableLayoutElement
			case "Live":
				let [liveUrl, liveInterval] = node.Live
				let liveElement = document.createElement('span')
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
			case "Blob":
				let blobElement = document.createElement('a')
				let [blobUrl, blobType, blobAlt] = node.Blob;
				if (blobUrl.startsWith('/')) {
					let origin = (new URL((document.querySelector('#url') as HTMLInputElement).value)).origin
					blobUrl = origin + blobUrl
				}
				blobElement.href = blobUrl
				blobElement.innerText = `${blobType} ${blobAlt}`
				return blobElement
			case "Menu":
				let menuLayoutElement = document.createElement('table')
				menuLayoutElement.style.display = 'inline-block'
				node.Menu.map(renderNode).forEach(element => {
					let menuLayoutRow = document.createElement('tr')
					menuLayoutElement.appendChild(menuLayoutRow)
					let td = document.createElement('td')
					td.appendChild(element)
					menuLayoutRow.appendChild(td)
				})
				return menuLayoutElement
			case "Ref":
				let [refUrl, refAlt] = node.Ref
				let refElement = document.createElement('a')
				refElement.innerText = refAlt
				if (refUrl.startsWith('/')) {
					let origin = (new URL((document.querySelector('#url') as HTMLInputElement).value)).origin
					refUrl = origin + refUrl
				}
				refElement.href = refUrl
				return refElement
			case "Form":
				let formLayoutElement = document.createElement('form')
				let formUrl = node.Form[1]
				if (formUrl.startsWith('/')) {
					let origin = (new URL((document.querySelector('#url') as HTMLInputElement).value)).origin
					formUrl = origin + formUrl
				}
				formLayoutElement.action = formUrl
				let formSubmit = document.createElement('input')
				formSubmit.type = 'submit'
				formLayoutElement.appendChild(renderNode({ VLayout: node.Form[0] }))
				formLayoutElement.appendChild(document.createElement('br'))
				formLayoutElement.appendChild(formSubmit)
				return formLayoutElement
			case "Field":
				let fieldElement = document.createElement('span')
				let fieldLabelElement = document.createElement('label')
				let field = document.createElement('input')
				let [fieldName, fieldLabel, fieldType] = node.Field
				let fieldId = Math.random().toString()
				field.id = fieldId
				field.type = fieldType
				field.name = fieldName
				fieldLabelElement.htmlFor = fieldId
				fieldLabelElement.innerText = fieldLabel
				fieldElement.appendChild(fieldLabelElement)
				fieldElement.appendChild(field)
				return fieldElement
			default:
				console.error("Unsupported element ", Object.keys(node)[0]);
				
				let unknownElement = document.createElement('span')
				unknownElement.innerText = "???"
				return unknownElement
		}
	}
}