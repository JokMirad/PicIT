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
    /**
     * Communication port to PicIT
     */
    this._portBackground = undefined;

    /**
     * Text input field, listen to input event
     */
    this._inTxt = document.getElementById("inputText");
    this._inTxt.placeholder = browser.i18n.getMessage("textInput");
    this._inTxt.addEventListener("input", this.updateValue());

    /**
     * QRCode output field
     */
    this._outCode = document.getElementById("qrcode");
  }

  show() {
    document.getElementById("warningBlock").style.display = "none";

    document.getElementById("body").style.width = "240px";
    document.getElementById("body").style.height = "230px";
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
        name: "popup",
      });

      // register message handler
      this._portBackground.onMessage.addListener(this.handleResponse());
    }

    // send init message to backgroundscirpt
    // to ask for first message to encode as QRCode
    this._portBackground.postMessage({
      who: "popup",
      what: "init",
    });
  }

  /**
   * Closure to handle messages from the background script
   * @returns {Function}
   */
  handleResponse() {
    const self = this;

    return (message) => {
      try {
        if (message !== undefined && message.content !== undefined) {
          /** message was found -> handle message*/
          self.convert(message.content);
        } else {
          /** message was empty, search for active tabs url*/
          var querying = browser.tabs.query({
            currentWindow: true,
            active: true,
          });
          querying.then(
            (tabs) => {
              if (tabs[0].url !== undefined) {
                self.convert(tabs[0].url);
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
   * @returns {Function}
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
   * convert message to qrcode and write that to ouput
   * @param message string
   */
  convert(message) {
    let secureText = undefined;
    this.clear();
    try {
      secureText = DOMPurify.sanitize(message);

      this._outCode.alt = secureText;
      this._inTxt.value = secureText;

      const qrcode = new QRCode(this._outCode, {
        text: secureText,
        width: 177,
        height: 177,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L,
      });
    } catch (exception) {
      console.error(
        "PicIT.Popup.convert(" +
          JSON.stringify(message) +
          " => " +
          JSON.stringify(secureText) +
          "): " +
          JSON.stringify(exception)
      );
	    // warning noticed: but no dynamic content
      this._outCode.innerHTML =
        '<p id="warnText">' +
        browser.i18n.getMessage("warnToLargeInputText") +
        "</p>";
    }
  }

  /** clear the output */
  clear() {
    this._outCode.innerHTML = "";
    this._outCode.alt = "";
    this._inTxt.value = "";
  }
}
