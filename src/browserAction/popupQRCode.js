"use strict";

/**
 * Popup page
 *
 * Calculate and show the QCode as popup bound to pageAction icon.
 * The message to encode is send via communication port from background script PicIT.js.
 * If message contains no data, than the activ tab.url will be used.
 *
 * Additional an input field of that popup can be edited directly. That enables very custom QRCodes.
 *
 * @type type
 */
class QRCodePopup {
	constructor() {
		// Communication port to PicIT
		this._portBackground = undefined;

		// Text input field, listen to input event
		this._inTxt = document.getElementById("inputText");
		this._inTxt.placeholder = browser.i18n.getMessage("textInput");
		this._inTxt.addEventListener("input", this.updateValue());
		this._securedText = "";

		// QRCode output field
		this._outputMessage = document.getElementById("outputMessage");
		this._outputQRCode = document.getElementById("outputQRCode");
		this._outputSVGPath = this._outputQRCode.lastElementChild;

		// Save to file
		this._btn = document.getElementById("btnSave");
		this._btn.value = browser.i18n.getMessage("save");
		this._btn.disabled = true;
		this._btn.addEventListener("click", this.save());
	}

	show() {
		document.getElementById("warningBlock").style.display = "none";
		document.getElementById("body").style.width = "240px";
		document.getElementById("body").style.height = "100%";
		document.getElementById("acceptedBlock").style.display = "block";
	}

	/**
	 * Initiate the communication connection to the backgroundscript
	 * @returns void
	 */
	connect() {
		// create connection if not already set
		if (this._portBackground === undefined) {
			this._portBackground = browser.runtime.connect({
				name: "popup"
			});

			// register message handler
			this._portBackground.onMessage.addListener(this.handleResponse());
		}

		// send init message to backgroundscirpt
		// to ask for first message to encode as QRCode
		this._portBackground.postMessage({
			who: "popup",
			what: "init"
		});
	}

	/**
	 * Closure to handle messages from the background script
	 * @returns { function(message : String) }
	 */
	handleResponse() {
		const self = this;

		return (message) => {
			try {
				if (message !== undefined && message.content !== undefined) {
					// message was found -> handle message
					self.convert(message.content);
				} else {
					// message was empty, search for active tabs url
					var querying = browser.tabs.query({
						currentWindow: true,
						active: true
					});
					querying.then(
							(tabs) => {
						if (tabs.length > 0) {
							var url = tabs[0].url;

							if (url !== undefined && !url.startsWith("about:") && !url.startsWith("file:")) {
								self.convert(url);
							} else {
								// ask for clipboard string
								navigator.clipboard.readText().then(
										text => {
											self.convert(text);
											self._inTxt.value = text;
										});
							}
						}
					},
							(event) => {
						console.error(
								"PicIT.Popup.handleResponse: get query: " +
								JSON.stringify(event)
								);
					}
					);
				}

				self._inTxt.setSelectionRange(0, 9999);
				self._inTxt.focus();

			} catch (exception) {
				console.error(
						"PicIT.Popup.handleResponse(" +
						JSON.stringify(message) +
						"): " +
						JSON.stringify(exception)
						);
			}
		};
	}

	/**
	 * Closure to handle input chnage events on input text field
	 * @returns {function(event)}
	 */
	updateValue() {
		const self = this;

		return (event) => {
			try {
				if (event !== undefined && event.target.value !== undefined) {
					self.convert(event.target.value);
				} else {
					self.clear();
				}
			} catch (exception) {
				console.error("PicIT.Popup.updateValue: " + exception);
			}
		};
	}

	/**
	 * Save the qcode to file without Download api
	 * @return { function(event) }
	 */
	save() {
		const self = this;

		return (event) => {
			try {
				console.log("save was called for: " + JSON.stringify(self._securedText));

				if (self._securedText !== null && self._securedText.length > 0) {
					// QRCode
					const qrcode = qrcodegen.QrCode.encodeText(self._securedText, qrcodegen.QrCode.Ecc.LOW);

					// as SVG image
					const svg = qrcode.toSvgString(0);
					const path = svg.substring(svg.indexOf("<path d=\"") + "<path d=\"".length, svg.indexOf("\" fill=\"#000000\""));

					// calculate scale and translation
					const width = this._outputQRCode.clientWidth;
					const height = this._outputQRCode.clientHeight;
					const min_width = Math.min(width, height);

					var scale = "scale(1,1)";
					var scale = svg.substring(svg.indexOf("viewBox=\"0 0 ") + "viewBox=\"0 0 ".length, svg.length);
					scale = scale.substring(0, scale.indexOf(" "));

					const factor = Math.trunc(min_width / scale);
					const size = factor * scale + 2 * factor;
					const translation = factor;

					// build image
					const image = `<svg xmlns="http://www.w3.org/2000/svg"`
							+	`\r\n	version=\"1.2\"`
							+	`\r\n	baseProfile=\"tiny\"`
							+	`\r\n	width=\"${size}\" height=\"${size}\"`
							+	`\r\n	viewBox=\"0,0,${size},${size}\">`
							+	`\r\n	<title>QR-Code</title>`
							+	`\r\n	<rect\r\n	width=\"100%\"\r\n	height=\"100%\"\r\n	fill=\"#ffffff\"/>`
							+	`\r\n	<path	fill=\"#000000\"`
							+	`\r\n			transform="translate(${translation},${translation})`
							+	`scale(${factor},${factor})"`
							+	`\r\n			d=\"${path}\"/>"`
							+	`\r\n</svg>`;

					// send job to background script
					this._portBackground.postMessage({
						who: "popup",
						what: "download",
						mime: "image/xml+svg",
						body: image
					});
				} else {
					console.error("PicIT.popupQRCode.save: empty message");
				}
			} catch (exception) {
				console.log(exception);
				console.error("PicIT.popupQRCode.save: " + JSON.stringify(exception));
			}
		};
	}

	/**
	 * convert message to qrcode and write that to ouput
	 * @param message string
	 */
	convert(message) {
		let secureText = undefined;
		this.clear();

		try {
			secureText = DOMPurify.sanitize(message);
			// set pure clean text (no trim) to enable fluent input by
			// user without deleting content whitespace while writing 
			this._inTxt.value = secureText;

			// trim and set/use clean trimmed value
			secureText = secureText.trim();

			if (secureText.length > 0) {
				this._securedText = secureText;
				// get QR-Code
				const qrcode = qrcodegen.QrCode.encodeText(this._securedText, qrcodegen.QrCode.Ecc.LOW);

				// as SVG image
				const svg = qrcode.toSvgString(0);
				const path = svg.substring(svg.indexOf("<path d=\"") + "<path d=\"".length, svg.indexOf("\" fill=\"#000000\""));

				// calculate scale and translation
				const width = this._outputQRCode.clientWidth;
				const height = this._outputQRCode.clientHeight;
				const min_width = Math.min(width, height);

				var scale = "scale(1,1)";
				var scale = svg.substring(svg.indexOf("viewBox=\"0 0 ") + "viewBox=\"0 0 ".length, svg.length);
				scale = scale.substring(0, scale.indexOf(" "));
				const factor = Math.trunc(min_width / scale);
				const translation_x = Math.trunc(((width / scale) - factor) / 2 * scale);
				const translation_y = Math.trunc(((height / scale) - factor) / 2 * scale);
				scale = "translate(" + translation_x + "," + translation_y + ") scale(" + factor + ", " + factor + ") ";

				// output
				this._outputSVGPath.setAttribute('d', path);
				this._outputSVGPath.setAttribute('transform', scale);

				this._outputQRCode.alt = this._securedText;
				this._btn.disabled = false;
			} else {
				this._outputSVGPath.setAttribute('d', "");
				this._outputSVGPath.setAttribute('transform', "");
				this.clear();
				this._btn.disabled = true;
			}
		} catch (exception) {
			console.error(
					"PicIT.Popup.convert(" +
					JSON.stringify(message) +
					" => " +
					JSON.stringify(secureText) +
					"): " +
					JSON.stringify(exception)
					);
			
			this._outputMessage.style.display = "block";
			var msg = document.getElementById("warnText");
			msg. textContent = browser.i18n.getMessage("warnToLargeInputText") ;
			this._outputQRCode.style.display = "none";
		}
	}

	/** clear the output */
	clear() {
		this._securedText = "";
		this._outputSVGPath.setAttribute("d", "");
		this._outputQRCode.style.display = "block";
		this._outputMessage.style.display = "none";
		this._outputQRCode.alt = "";
		this._inTxt.value = "";
		this._btn.disabled = true;
	}
}
