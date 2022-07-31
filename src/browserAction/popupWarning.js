"use strict";

/**
 * Warning popup page
 *
 * User will be warned to use extension and have to accept warning.
 *
 * @type type
 */
class WarningPopup {
	constructor(_callback) {
		this._btnAccept = document.getElementById("warningAccept");
		this._btnDecline = document.getElementById("warningDecline");
		this._msgDecline = document.getElementById("messageDecline");

		this._callback = _callback;
	}

	show(declined = false) {
		try {
			document.getElementById("body").style.width = "400px";
			document.getElementById("warningBlock").style.display = "block";

			document.getElementById("warningTitle")
					.textContent = browser.i18n.getMessage(
					"extensionInitialUsageWarningTitle");

			document.getElementById("warningMessage"
					).textContent = browser.i18n.getMessage(
					"extensionInitialUsageWarning");

			this._btnAccept.textContent = browser.i18n.getMessage("buttonAccept");
			this._btnAccept.addEventListener("click", this.onAccept());

			if (declined) {
				this._btnDecline.style.display = "none";
				this._msgDecline.style.display = "block";
				this._msgDecline.textContent = browser.i18n.getMessage("messageDeny");
			} else {
				this._btnDecline.textContent = browser.i18n.getMessage("buttonDeny");
				this._btnDecline.addEventListener("click", this.onDecline());
				this._msgDecline.style.display = "none";
			}
		} catch (exception) {
			console.error("PicIT.WarningPopup.show: \r\n" + JSON.stringify(exception)+"\r\n"+exception);
		}
	}

	onAccept(event) {
		const self = this;

		return (event) => {
			const warning = {value: "accepted"};
			browser.storage.local
					.set({warning})
					.then(self.setWarning(), self.onError());
		};
	}
	onDecline(event) {
		const self = this;

		return (event) => {
			const warning = {value: "declined"};
			browser.storage.local
					.set({warning})
					.then(self.setWarning(), self.onError());
		};
	}
	setWarning() {
		const self = this;

		return () => {
			self._callback();
		};
	}
	onError() {
		return (error) => {
			console.error("PicIT.popupWarning.onError: \r\n" + JSON.stringify(error)+"\r\n"+error);
		};
	}
}
