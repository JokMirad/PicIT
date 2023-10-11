"use strict";

/**
 * Background page
 *
 * The page register the context menu for the browser content.
 * It setup an event handler for the context menu.
 * The backgroud page opens a bidirectional communication port
 * and listen for popup.
 *
 * @type type
 */
class PicIT {
	constructor(extensionName) {
		// constant id of the menu we listen to
		this._MENU_ID = extensionName;

		// text from content page that was purified / sanitized
		this._secureText = undefined;

		// bidirectional communication to browserAction popup
		this._portPopup = undefined;

		// download ids we own and that are running
		this._downloads = [];

		// The context menu properties
		this._contextMenu = {
			id: this._MENU_ID,
			title: browser.i18n.getMessage("extensionMenuName"),
			contexts: ["link", "selection", "image", "audio", "video"]
		};

		// listen to download events to free allocated memory on complete
		browser.downloads.onChanged.addListener(this.handleDownloadChanged());
	}

	/**
	 * ContextMenu getter
	 * @return the context menu
	 */
	get contextMenu() {
		return this._contextMenu;
	}

	/**
	 * Closure to handle context menu click event
	 * @returns { function(info,tab) }
	 */
	contextMenuHandler() {
		const self = this;
		
		return (info, tab) => {
			if (info.menuItemId === self._MENU_ID) {
				let text;
				if (info.srcUrl !== undefined) {
					text = info.srcUrl;
				} else if (info.linkUrl !== undefined) {
					text = info.linkUrl;
				} else if (info.selectionText !== undefined) {
					text = info.selectionText;
				}

				self._secureText = DOMPurify.sanitize(text);

				browser.action.openPopup();
			}
		};
	}

	/**
	 * Closure to handle connected event on commonication port
	 * @returns {function(port)}
	 */
	connected() {
		const self = this;

		return (port) => {
			if (
				self._portPopup !== undefined &&
				self._portPopup.onMessage.hasListener()
			) {
				self._portPopup.onMessage.removeListener(self.messageHandler());
			}
			self._portPopup = port;

			// register message handler
			self._portPopup.onMessage.addListener(self.messageHandler());
		};
	}

	/**
	 * Closure to handle messages on the communication port
	 * @returns {function(event)}
	 */
	messageHandler() {
		const self = this;

		return (event) => {
			try{
			if (event.who === "popup" && event.what === "download" && event.body !== undefined) {
				// save as image
				// convert svg from event data into memory mapped image file
				console.log("mime; "+event.mime);
				var data = new Blob([event.body], {type: event.mime});
				const url = URL.createObjectURL(data);
				
				// name of the file
				var name = "";
				switch(event.mime){
					case "image/webp": 
						name = "QRCode.webp";
						break;
					case "image/xml+svg":
						name = "QRCode.svg";
						break;					
					case "image/png":
					default:
						name = "QRCode.png";
						break;
				}
				// setup download
				var downloading = browser.downloads.download({
					url: url,
					filename: name,
					saveAs: true,
					allowHttpErrors: true,
					conflictAction: "uniquify"
				});
						
				downloading.then((id) => {
						// register is to cleanup allocated memory on complete
						self._downloads.push(id);
					},
					(error) => {
						console.error(" download: " + error);
					}).catch((error) => {
						console.error(" download catch: " + error);
					});
			} else {

				// check if we still know _secureText: send text or empty hi
				let content = undefined;

				if (self._portPopup !== undefined) {
					if (event.who === "popup" && self._secureText !== undefined) {
						content = self._secureText;
						self._secureText = undefined;
					}

					self._portPopup.postMessage({
						who: "PicIT",
						content: content
					});
				}
			}
			
			}catch(exception){
				console.error("PicIt.background.PicIt.messageHandler: \r\n"+exception+"\r\n"+ JSON.stringify(exception));
			}
		};
	}

	/**
	 * Closure to handle download events, and to cleanup allocated memory on complete
	 * @returns { Function(delta) }
	 */
	handleDownloadChanged() {
		const self = this;
		return (delta) => {
			if (delta.state && delta.state.current === "complete") {

				// clean up
				if (self._downloads.indexOf(delta.id) > -1) {
					URL.revokeObjectURL(delta.url);
					console.log(`Download ${delta.id} has completed and was cleand`);
				} else {
					console.log(`Download ${delta.id} has completed.`);
				}
			} else {
				console.log(JSON.stringify(delta));
			}
		};
	}

}
